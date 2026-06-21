// QuantDeskBridge.cs
// NinjaTrader 8.1.6.3 read-only local bridge for the MES/MNQ decision-support app.
//
// Install target:
//   C:\Users\Mike\Documents\NinjaTrader 8\bin\Custom\AddOns\QuantDeskBridge.cs
//
// Compile from NinjaTrader:
//   New > NinjaScript Editor > right-click > Compile
//
// This bridge is intentionally read-only. It does not submit, change, cancel,
// reverse, or flatten orders.

#region Using declarations
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Media;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
#endregion

namespace NinjaTrader.NinjaScript.AddOns
{
    public class QuantDeskBridge : AddOnBase
    {
        private const string BridgeName = "QuantDeskBridge";
        private const string DefaultInstrumentRoot = "MES";
        private const string TradingHoursTemplate = "CME US Index Futures ETH";
        private const int DefaultBarsBack = 450;
        private const int RecentBarsRequestTimeoutMs = 5000;
        private const string Prefix = "http://127.0.0.1:8765/";

        private readonly object sync = new object();
        private readonly Dictionary<string, List<BridgeBar>> barsByKey = new Dictionary<string, List<BridgeBar>>();
        private readonly Dictionary<string, BarsRequest> requestsByKey = new Dictionary<string, BarsRequest>();
        private HttpListener listener;
        private Thread listenerThread;
        private bool running;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = BridgeName;
                Description = "Read-only local bridge for Quant Desk Session Lab.";
            }
            else if (State == State.Active)
            {
                StartBridge();
            }
            else if (State == State.Terminated)
            {
                StopBridge();
            }
        }

        private static string CurrentDefaultInstrument()
        {
            return CurrentInstrumentSnapshot(DateTime.Now).Instrument;
        }

        private static InstrumentSnapshot CurrentInstrumentSnapshot(DateTime asOf)
        {
            string chartInstrument = ActiveChartInstrument();
            if (!string.IsNullOrWhiteSpace(chartInstrument))
                return new InstrumentSnapshot(NormalizeInstrumentName(chartInstrument), "active_chart", chartInstrument);

            return new InstrumentSnapshot(FrontMonthInstrument(DefaultInstrumentRoot, asOf), "front_month_rollover", null);
        }

        private static string ActiveChartInstrument()
        {
            try
            {
                Application application = Application.Current;
                if (application == null)
                    return null;

                if (application.Dispatcher.CheckAccess())
                    return ActiveChartInstrumentOnDispatcher(application);

                return application.Dispatcher.Invoke(new Func<string>(() => ActiveChartInstrumentOnDispatcher(application)));
            }
            catch
            {
                return null;
            }
        }

        private static string ActiveChartInstrumentOnDispatcher(Application application)
        {
            if (application == null || application.Windows == null)
                return null;

            Window activeWindow = application.Windows
                .OfType<Window>()
                .Where(window => window != null && window.IsActive)
                .FirstOrDefault();

            string activeInstrument = InstrumentFromWindow(activeWindow);
            if (!string.IsNullOrWhiteSpace(activeInstrument))
                return activeInstrument;

            foreach (Window window in application.Windows.OfType<Window>())
            {
                string instrument = InstrumentFromWindow(window);
                if (!string.IsNullOrWhiteSpace(instrument))
                    return instrument;
            }

            return null;
        }

        private static string InstrumentFromWindow(Window window)
        {
            if (window == null)
                return null;

            foreach (DependencyObject dependencyObject in VisualChildren(window))
            {
                if (dependencyObject == null)
                    continue;

                Type type = dependencyObject.GetType();
                if (type.FullName != null && type.FullName.Contains("NinjaTrader.Gui.Chart.ChartControl"))
                {
                    string instrument = InstrumentFromObject(dependencyObject);
                    if (!string.IsNullOrWhiteSpace(instrument))
                        return instrument;
                }
            }

            return null;
        }

        private static IEnumerable<DependencyObject> VisualChildren(DependencyObject root)
        {
            if (root == null)
                yield break;

            int count = 0;
            try
            {
                count = VisualTreeHelper.GetChildrenCount(root);
            }
            catch
            {
                yield break;
            }

            for (int index = 0; index < count; index++)
            {
                DependencyObject child = null;
                try
                {
                    child = VisualTreeHelper.GetChild(root, index);
                }
                catch
                {
                    continue;
                }

                if (child == null)
                    continue;

                yield return child;

                foreach (DependencyObject descendant in VisualChildren(child))
                    yield return descendant;
            }
        }

        private static string InstrumentFromObject(object source)
        {
            if (source == null)
                return null;

            string directInstrument = ReadFullNameFromProperty(source, "Instrument");
            if (!string.IsNullOrWhiteSpace(directInstrument))
                return directInstrument;

            object barsArray = ReadProperty(source, "BarsArray");
            if (barsArray is IEnumerable enumerable)
            {
                foreach (object item in enumerable)
                {
                    string instrument = InstrumentFromObject(item);
                    if (!string.IsNullOrWhiteSpace(instrument))
                        return instrument;
                }
            }

            object chartBars = ReadProperty(source, "ChartBars");
            if (chartBars != null && !object.ReferenceEquals(chartBars, source))
            {
                string instrument = InstrumentFromObject(chartBars);
                if (!string.IsNullOrWhiteSpace(instrument))
                    return instrument;
            }

            object bars = ReadProperty(source, "Bars");
            if (bars != null && !object.ReferenceEquals(bars, source))
            {
                string instrument = InstrumentFromObject(bars);
                if (!string.IsNullOrWhiteSpace(instrument))
                    return instrument;
            }

            return null;
        }

        private static string ReadFullNameFromProperty(object source, string propertyName)
        {
            object value = ReadProperty(source, propertyName);
            if (value == null)
                return null;

            object fullName = ReadProperty(value, "FullName");
            if (fullName != null && !string.IsNullOrWhiteSpace(fullName.ToString()))
                return fullName.ToString();

            string text = value.ToString();
            return string.IsNullOrWhiteSpace(text) ? null : text;
        }

        private static string NormalizeInstrumentName(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            string clean = value.Trim().TrimStart('/').ToUpperInvariant();
            clean = System.Text.RegularExpressions.Regex.Replace(clean, @"\s+", " ");

            Dictionary<string, string> monthCodes = new Dictionary<string, string>
            {
                { "JAN", "01" },
                { "FEB", "02" },
                { "MAR", "03" },
                { "APR", "04" },
                { "MAY", "05" },
                { "JUN", "06" },
                { "JUL", "07" },
                { "AUG", "08" },
                { "SEP", "09" },
                { "OCT", "10" },
                { "NOV", "11" },
                { "DEC", "12" }
            };

            System.Text.RegularExpressions.Match monthNameMatch = System.Text.RegularExpressions.Regex.Match(
                clean,
                @"^(MES|MNQ|ES|NQ)\s+([A-Z]{3})\s*-?\s*(\d{2})$");
            if (monthNameMatch.Success && monthCodes.ContainsKey(monthNameMatch.Groups[2].Value))
            {
                return string.Format(
                    CultureInfo.InvariantCulture,
                    "{0} {1}-{2}",
                    monthNameMatch.Groups[1].Value,
                    monthCodes[monthNameMatch.Groups[2].Value],
                    monthNameMatch.Groups[3].Value);
            }

            System.Text.RegularExpressions.Match numericMonthMatch = System.Text.RegularExpressions.Regex.Match(
                clean,
                @"^(MES|MNQ|ES|NQ)\s+(\d{1,2})\s*-?\s*(\d{2})$");
            if (numericMonthMatch.Success)
            {
                int month;
                if (int.TryParse(numericMonthMatch.Groups[2].Value, out month))
                {
                    return string.Format(
                        CultureInfo.InvariantCulture,
                        "{0} {1:00}-{2}",
                        numericMonthMatch.Groups[1].Value,
                        month,
                        numericMonthMatch.Groups[3].Value);
                }
            }

            return clean;
        }

        private static object ReadProperty(object source, string propertyName)
        {
            if (source == null)
                return null;

            try
            {
                PropertyInfo property = source.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public);
                return property == null ? null : property.GetValue(source, null);
            }
            catch
            {
                return null;
            }
        }

        private static string FrontMonthInstrument(string root, DateTime asOf)
        {
            int year = asOf.Year;
            int[] quarterlyMonths = new int[] { 3, 6, 9, 12 };
            DateTime asOfDate = asOf.Date;

            foreach (int month in quarterlyMonths)
            {
                if (asOfDate < RolloverDate(year, month))
                    return string.Format(CultureInfo.InvariantCulture, "{0} {1:00}-{2:00}", root, month, year % 100);
            }

            return string.Format(CultureInfo.InvariantCulture, "{0} 03-{1:00}", root, (year + 1) % 100);
        }

        private static DateTime RolloverDate(int year, int month)
        {
            return ThirdFriday(year, month).AddDays(-8);
        }

        private static DateTime ThirdFriday(int year, int month)
        {
            DateTime first = new DateTime(year, month, 1);
            int daysToFriday = ((int)DayOfWeek.Friday - (int)first.DayOfWeek + 7) % 7;
            return first.AddDays(daysToFriday + 14);
        }

        private void StartBridge()
        {
            if (running)
                return;

            running = true;
            string defaultInstrument = CurrentDefaultInstrument();
            StartBars(defaultInstrument, 1);
            StartBars(defaultInstrument, 5);
            StartBars(defaultInstrument, 15);

            listener = new HttpListener();
            listener.Prefixes.Add(Prefix);
            listener.Start();

            listenerThread = new Thread(ListenLoop);
            listenerThread.IsBackground = true;
            listenerThread.Name = BridgeName + " HTTP";
            listenerThread.Start();

            Print(BridgeName + " started at " + Prefix);
        }

        private void StopBridge()
        {
            running = false;

            lock (sync)
            {
                foreach (KeyValuePair<string, BarsRequest> pair in requestsByKey)
                {
                    try
                    {
                        pair.Value.Update -= OnBarUpdate;
                        pair.Value.Dispose();
                    }
                    catch { }
                }
                requestsByKey.Clear();
                barsByKey.Clear();
            }

            try { listener?.Stop(); } catch { }
            try { listener?.Close(); } catch { }
            listener = null;

            try
            {
                if (listenerThread != null && listenerThread.IsAlive)
                    listenerThread.Join(500);
            }
            catch { }

            listenerThread = null;
            Print(BridgeName + " stopped.");
        }

        private void StartBars(string instrumentName, int minutes)
        {
            string key = MakeBarsKey(instrumentName, minutes);
            if (requestsByKey.ContainsKey(key))
                return;

            Instrument instrument = Instrument.GetInstrument(instrumentName);
            if (instrument == null)
            {
                Print(BridgeName + " could not resolve instrument: " + instrumentName);
                return;
            }

            BarsRequest request = new BarsRequest(instrument, DefaultBarsBack);
            request.BarsPeriod = new BarsPeriod { BarsPeriodType = BarsPeriodType.Minute, Value = minutes };
            request.TradingHours = TradingHours.Get(TradingHoursTemplate) ?? TradingHours.Get("Default 24 x 7");
            request.Update += OnBarUpdate;

            lock (sync)
            {
                requestsByKey[key] = request;
                barsByKey[key] = new List<BridgeBar>();
            }

            request.Request((barsRequest, errorCode, errorMessage) =>
            {
                if (errorCode != ErrorCode.NoError)
                {
                    Print(BridgeName + " bars request error for " + key + ": " + errorCode + " " + errorMessage);
                    return;
                }

                List<BridgeBar> seed = new List<BridgeBar>();
                for (int i = 0; i < barsRequest.Bars.Count; i++)
                    seed.Add(ReadBar(barsRequest.Bars, i));

                lock (sync)
                    barsByKey[key] = TrimBars(seed);
            });
        }

        private void OnBarUpdate(object sender, BarsUpdateEventArgs e)
        {
            BarsRequest request = sender as BarsRequest;
            if (request == null)
                return;

            string key = MakeBarsKey(request.Instrument.FullName, request.BarsPeriod.Value);

            lock (sync)
            {
                if (!barsByKey.ContainsKey(key))
                    barsByKey[key] = new List<BridgeBar>();

                List<BridgeBar> existing = barsByKey[key];
                for (int i = e.MinIndex; i <= e.MaxIndex; i++)
                {
                    BridgeBar bar = ReadBar(e.BarsSeries, i);
                    int index = existing.FindIndex(x => x.Time == bar.Time);
                    if (index >= 0)
                        existing[index] = bar;
                    else
                        existing.Add(bar);
                }
                barsByKey[key] = TrimBars(existing);
            }
        }

        private BridgeBar ReadBar(Bars bars, int index)
        {
            return new BridgeBar
            {
                Time = bars.GetTime(index),
                Open = bars.GetOpen(index),
                High = bars.GetHigh(index),
                Low = bars.GetLow(index),
                Close = bars.GetClose(index),
                Volume = bars.GetVolume(index)
            };
        }

        private BridgeBar ReadBar(BarsSeries barsSeries, int index)
        {
            return new BridgeBar
            {
                Time = barsSeries.GetTime(index),
                Open = barsSeries.GetOpen(index),
                High = barsSeries.GetHigh(index),
                Low = barsSeries.GetLow(index),
                Close = barsSeries.GetClose(index),
                Volume = barsSeries.GetVolume(index)
            };
        }

        private static List<BridgeBar> TrimBars(List<BridgeBar> bars)
        {
            return bars
                .OrderBy(x => x.Time)
                .Skip(Math.Max(0, bars.Count - DefaultBarsBack))
                .ToList();
        }

        private void ListenLoop()
        {
            while (running && listener != null)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(_ => HandleRequest(context));
                }
                catch (HttpListenerException)
                {
                    if (running)
                        Print(BridgeName + " listener interrupted.");
                }
                catch (Exception ex)
                {
                    Print(BridgeName + " listener error: " + ex.Message);
                }
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            try
            {
                context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS");
                context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
                context.Response.Headers.Add("Access-Control-Allow-Private-Network", "true");

                if (context.Request.HttpMethod == "OPTIONS")
                {
                    WriteJson(context.Response, new Dictionary<string, object> { { "ok", true } });
                    return;
                }

                string path = context.Request.Url.AbsolutePath.Trim('/').ToLowerInvariant();
                if (path == "health")
                    WriteJson(context.Response, BuildHealth());
                else if (path == "accounts")
                    WriteJson(context.Response, BuildAccounts());
                else if (path == "snapshot")
                    WriteJson(context.Response, BuildSnapshot(context.Request.QueryString["instrument"] ?? CurrentDefaultInstrument()));
                else if (path == "bars")
                    WriteJson(context.Response, BuildBars(context.Request.QueryString["instrument"] ?? CurrentDefaultInstrument(), context.Request.QueryString["timeframe"] ?? "5m", context.Request.QueryString["limit"] ?? "100"));
                else if (path == "historical-bars")
                    WriteJson(context.Response, BuildHistoricalBars(
                        context.Request.QueryString["instrument"] ?? CurrentDefaultInstrument(),
                        context.Request.QueryString["timeframe"] ?? "5m",
                        context.Request.QueryString["from"],
                        context.Request.QueryString["to"],
                        context.Request.QueryString["limit"] ?? "2000"));
                else if (path == "positions")
                    WriteJson(context.Response, BuildPositions(context.Request.QueryString["account"] ?? "Sim101"));
                else
                    WriteJson(context.Response, new Dictionary<string, object> { { "ok", false }, { "error", "Unknown endpoint" } }, 404);
            }
            catch (Exception ex)
            {
                WriteJson(context.Response, new Dictionary<string, object> { { "ok", false }, { "error", ex.Message } }, 500);
            }
        }

        private Dictionary<string, object> BuildHealth()
        {
            DateTime asOf = DateTime.Now;
            InstrumentSnapshot instrument = CurrentInstrumentSnapshot(asOf);
            return new Dictionary<string, object>
            {
                { "ok", true },
                { "name", BridgeName },
                { "version", "0.1.7-readonly" },
                { "ninjaTraderVersion", Core.Globals.ProductVersion },
                { "readOnly", true },
                { "defaultInstrument", instrument.Instrument },
                { "instrumentSource", instrument.Source },
                { "rawDefaultInstrument", instrument.RawInstrument },
                { "serverTime", asOf.ToString("o") }
            };
        }

        private Dictionary<string, object> BuildAccounts()
        {
            return new Dictionary<string, object>
            {
                { "ok", true },
                { "accounts", Account.All.Select(a => a.Name).ToList() },
                { "preferred", new List<string> { "Sim101", "206257" } }
            };
        }

        private Dictionary<string, object> BuildSnapshot(string instrumentName)
        {
            List<BridgeBar> oneMinute = GetBars(instrumentName, 1, 450);
            BridgeBar last = oneMinute.LastOrDefault();
            List<BridgeBar> highLowBars = oneMinute.Count > 0 ? oneMinute : GetBars(instrumentName, 5, 450);

            return new Dictionary<string, object>
            {
                { "ok", true },
                { "instrument", instrumentName },
                { "last", last == null ? null : ToDictionary(last) },
                { "currentPrice", last == null ? (double?)null : last.Close },
                { "sessionHigh", highLowBars.Count == 0 ? (double?)null : highLowBars.Max(x => x.High) },
                { "sessionLow", highLowBars.Count == 0 ? (double?)null : highLowBars.Min(x => x.Low) },
                { "updatedAt", DateTime.Now.ToString("o") }
            };
        }

        private Dictionary<string, object> BuildBars(string instrumentName, string timeframe, string limitText)
        {
            int minutes = ParseTimeframe(timeframe);
            int limit;
            if (!int.TryParse(limitText, out limit))
                limit = 100;
            limit = Math.Max(1, Math.Min(450, limit));

            List<BridgeBar> bars = GetBars(instrumentName, minutes, limit);
            return new Dictionary<string, object>
            {
                { "ok", true },
                { "instrument", instrumentName },
                { "timeframe", minutes + "m" },
                { "count", bars.Count },
                { "bars", bars.Select(ToDictionary).ToList() }
            };
        }

        private Dictionary<string, object> BuildHistoricalBars(string instrumentName, string timeframe, string fromText, string toText, string limitText)
        {
            int minutes = ParseTimeframe(timeframe);
            int limit;
            if (!int.TryParse(limitText, out limit))
                limit = 2000;
            limit = Math.Max(1, Math.Min(25000, limit));

            DateTime fromLocal;
            DateTime toLocal;
            if (!TryParseLocalDateTime(fromText, out fromLocal) || !TryParseLocalDateTime(toText, out toLocal))
            {
                return new Dictionary<string, object>
                {
                    { "ok", false },
                    { "error", "historical-bars requires ISO from and to query parameters." },
                    { "example", "/historical-bars?timeframe=5m&from=2026-05-15T09:30:00-04:00&to=2026-05-15T10:10:00-04:00" }
                };
            }

            if (toLocal <= fromLocal)
            {
                return new Dictionary<string, object>
                {
                    { "ok", false },
                    { "error", "to must be after from." }
                };
            }

            Instrument instrument = Instrument.GetInstrument(instrumentName);
            if (instrument == null)
            {
                return new Dictionary<string, object>
                {
                    { "ok", false },
                    { "error", "Instrument not found: " + instrumentName }
                };
            }

            List<BridgeBar> bars = new List<BridgeBar>();
            string requestError = null;
            ManualResetEvent done = new ManualResetEvent(false);

            BarsRequest request = null;
            try
            {
                request = new BarsRequest(instrument, fromLocal, toLocal);
                request.BarsPeriod = new BarsPeriod { BarsPeriodType = BarsPeriodType.Minute, Value = minutes };
                request.TradingHours = TradingHours.Get(TradingHoursTemplate) ?? TradingHours.Get("Default 24 x 7");

                request.Request((barsRequest, errorCode, errorMessage) =>
                {
                    try
                    {
                        if (errorCode != ErrorCode.NoError)
                        {
                            requestError = errorCode + " " + errorMessage;
                            return;
                        }

                        for (int i = 0; i < barsRequest.Bars.Count; i++)
                        {
                            BridgeBar bar = ReadBar(barsRequest.Bars, i);
                            if (bar.Time >= fromLocal && bar.Time <= toLocal)
                                bars.Add(bar);
                        }
                    }
                    finally
                    {
                        done.Set();
                    }
                });

                if (!done.WaitOne(15000))
                    requestError = "Historical request timed out after 15 seconds.";
            }
            catch (Exception ex)
            {
                requestError = ex.Message;
            }
            finally
            {
                try { request?.Dispose(); } catch { }
                try { done.Dispose(); } catch { }
            }

            if (!string.IsNullOrEmpty(requestError))
            {
                return new Dictionary<string, object>
                {
                    { "ok", false },
                    { "error", requestError },
                    { "instrument", instrumentName },
                    { "timeframe", minutes + "m" },
                    { "from", fromLocal.ToString("o") },
                    { "to", toLocal.ToString("o") }
                };
            }

            bars = bars
                .OrderBy(x => x.Time)
                .Skip(Math.Max(0, bars.Count - limit))
                .ToList();

            return new Dictionary<string, object>
            {
                { "ok", true },
                { "source", "ninjatrader_historical_request" },
                { "instrument", instrumentName },
                { "timeframe", minutes + "m" },
                { "from", fromLocal.ToString("o") },
                { "to", toLocal.ToString("o") },
                { "count", bars.Count },
                { "bars", bars.Select(ToDictionary).ToList() }
            };
        }

        private Dictionary<string, object> BuildPositions(string accountName)
        {
            Account account = Account.All.FirstOrDefault(a => a.Name == accountName);
            if (account == null)
            {
                return new Dictionary<string, object>
                {
                    { "ok", false },
                    { "error", "Account not found: " + accountName },
                    { "availableAccounts", Account.All.Select(a => a.Name).ToList() }
                };
            }

            List<Dictionary<string, object>> positions = new List<Dictionary<string, object>>();
            foreach (Position position in account.Positions)
            {
                positions.Add(new Dictionary<string, object>
                {
                    { "instrument", position.Instrument.FullName },
                    { "marketPosition", position.MarketPosition.ToString() },
                    { "quantity", position.Quantity },
                    { "averagePrice", position.AveragePrice }
                });
            }

            return new Dictionary<string, object>
            {
                { "ok", true },
                { "account", accountName },
                { "positions", positions }
            };
        }

        private List<BridgeBar> GetBars(string instrumentName, int minutes, int limit)
        {
            string key = MakeBarsKey(instrumentName, minutes);
            if (!requestsByKey.ContainsKey(key))
                StartBars(instrumentName, minutes);

            string refreshError;
            List<BridgeBar> refreshedBars = RequestRecentBars(instrumentName, minutes, limit, out refreshError);
            if (refreshedBars.Count > 0)
            {
                lock (sync)
                {
                    barsByKey[key] = TrimBars(refreshedBars);
                    return barsByKey[key]
                        .OrderBy(x => x.Time)
                        .Skip(Math.Max(0, barsByKey[key].Count - limit))
                        .ToList();
                }
            }

            if (!string.IsNullOrEmpty(refreshError))
                Print(BridgeName + " recent bars refresh failed for " + key + ": " + refreshError);

            lock (sync)
            {
                if (!barsByKey.ContainsKey(key))
                    return new List<BridgeBar>();
                return barsByKey[key]
                    .OrderBy(x => x.Time)
                    .Skip(Math.Max(0, barsByKey[key].Count - limit))
                    .ToList();
            }
        }

        private List<BridgeBar> RequestRecentBars(string instrumentName, int minutes, int limit, out string error)
        {
            error = null;
            Instrument instrument = Instrument.GetInstrument(instrumentName);
            if (instrument == null)
            {
                error = "Instrument not found: " + instrumentName;
                return new List<BridgeBar>();
            }

            List<BridgeBar> bars = new List<BridgeBar>();
            ManualResetEvent done = new ManualResetEvent(false);
            BarsRequest request = null;
            string callbackError = null;

            try
            {
                request = new BarsRequest(instrument, Math.Max(DefaultBarsBack, limit));
                request.BarsPeriod = new BarsPeriod { BarsPeriodType = BarsPeriodType.Minute, Value = minutes };
                request.TradingHours = TradingHours.Get(TradingHoursTemplate) ?? TradingHours.Get("Default 24 x 7");

                request.Request((barsRequest, errorCode, errorMessage) =>
                {
                    try
                    {
                        if (errorCode != ErrorCode.NoError)
                        {
                            callbackError = errorCode + " " + errorMessage;
                            return;
                        }

                        for (int i = 0; i < barsRequest.Bars.Count; i++)
                            bars.Add(ReadBar(barsRequest.Bars, i));
                    }
                    finally
                    {
                        done.Set();
                    }
                });

                if (!done.WaitOne(RecentBarsRequestTimeoutMs))
                    error = "Recent bars request timed out after " + RecentBarsRequestTimeoutMs.ToString(CultureInfo.InvariantCulture) + "ms.";
                else
                    error = callbackError;
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }
            finally
            {
                try { request?.Dispose(); } catch { }
                try { done.Dispose(); } catch { }
            }

            return bars
                .OrderBy(x => x.Time)
                .Skip(Math.Max(0, bars.Count - limit))
                .ToList();
        }

        private static int ParseTimeframe(string value)
        {
            string raw = (value ?? "5m").Trim().ToLowerInvariant();
            if (raw.EndsWith("h"))
            {
                int hours;
                if (int.TryParse(raw.Replace("h", ""), out hours) && (hours == 1 || hours == 4))
                    return hours * 60;
            }

            string clean = raw.Replace("min", "").Replace("m", "");
            int minutes;
            if (!int.TryParse(clean, out minutes))
                minutes = 5;
            if (minutes != 1 && minutes != 5 && minutes != 15 && minutes != 60 && minutes != 240)
                minutes = 5;
            return minutes;
        }

        private static bool TryParseLocalDateTime(string value, out DateTime localTime)
        {
            localTime = DateTime.MinValue;
            if (string.IsNullOrWhiteSpace(value))
                return false;

            DateTimeOffset dto;
            if (DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out dto))
            {
                // NinjaTrader bar timestamps are compared as chart/session wall-clock times.
                // Preserve the supplied ET wall-clock value instead of converting it to the
                // Windows local timezone, otherwise RTH windows shift by three hours on Mike's PC.
                localTime = dto.DateTime;
                return true;
            }

            DateTime dt;
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out dt))
            {
                localTime = dt;
                return true;
            }

            return false;
        }

        private static string MakeBarsKey(string instrumentName, int minutes)
        {
            return instrumentName.Trim().ToUpperInvariant() + "|" + minutes.ToString(CultureInfo.InvariantCulture) + "m";
        }

        private static Dictionary<string, object> ToDictionary(BridgeBar bar)
        {
            return new Dictionary<string, object>
            {
                { "time", bar.Time.ToString("o") },
                { "open", bar.Open },
                { "high", bar.High },
                { "low", bar.Low },
                { "close", bar.Close },
                { "volume", bar.Volume }
            };
        }

        private static void WriteJson(HttpListenerResponse response, object payload, int statusCode = 200)
        {
            string json = SimpleJson.Serialize(payload);
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            response.StatusCode = statusCode;
            response.ContentType = "application/json";
            response.ContentEncoding = Encoding.UTF8;
            response.ContentLength64 = bytes.Length;
            response.OutputStream.Write(bytes, 0, bytes.Length);
            response.OutputStream.Close();
        }

        private class BridgeBar
        {
            public DateTime Time { get; set; }
            public double Open { get; set; }
            public double High { get; set; }
            public double Low { get; set; }
            public double Close { get; set; }
            public long Volume { get; set; }
        }

        private class InstrumentSnapshot
        {
            public InstrumentSnapshot(string instrument, string source, string rawInstrument)
            {
                Instrument = instrument;
                Source = source;
                RawInstrument = rawInstrument;
            }

            public string Instrument { get; private set; }
            public string Source { get; private set; }
            public string RawInstrument { get; private set; }
        }

        private static class SimpleJson
        {
            public static string Serialize(object value)
            {
                if (value == null) return "null";
                if (value is string) return Quote((string)value);
                if (value is bool) return (bool)value ? "true" : "false";
                if (value is int || value is long || value is double || value is decimal || value is float)
                    return Convert.ToString(value, CultureInfo.InvariantCulture);

                IDictionary dict = value as IDictionary;
                if (dict != null)
                {
                    List<string> parts = new List<string>();
                    foreach (DictionaryEntry entry in dict)
                        parts.Add(Quote(Convert.ToString(entry.Key)) + ":" + Serialize(entry.Value));
                    return "{" + string.Join(",", parts.ToArray()) + "}";
                }

                IEnumerable enumerable = value as IEnumerable;
                if (enumerable != null)
                {
                    List<string> parts = new List<string>();
                    foreach (object item in enumerable)
                        parts.Add(Serialize(item));
                    return "[" + string.Join(",", parts.ToArray()) + "]";
                }

                return Quote(Convert.ToString(value));
            }

            private static string Quote(string text)
            {
                if (text == null) return "null";
                return "\"" + text
                    .Replace("\\", "\\\\")
                    .Replace("\"", "\\\"")
                    .Replace("\r", "\\r")
                    .Replace("\n", "\\n") + "\"";
            }
        }
    }
}
