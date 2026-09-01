// QuantDeskScannerOverlay.cs
// Visual-only NinjaTrader indicator for scanner-owned FVG/final-boss zones.
//
// Install target:
//   C:\Users\Mike\Documents\NinjaTrader 8\bin\Custom\Indicators\QuantDeskScannerOverlay.cs
//
// Compile from NinjaTrader:
//   New > NinjaScript Editor > right-click > Compile
//
// This indicator reads the local scanner zone feed and draws chart context only.
// It does not submit, change, cancel, reverse, flatten, or approve orders.

#region Using declarations
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows.Media;
using NinjaTrader.Gui.Tools;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

namespace NinjaTrader.NinjaScript.Indicators
{
    public class QuantDeskScannerOverlay : Indicator
    {
        private const string FeedFileName = "quant-desk-scanner-zones.json";
        private DateTime lastReadAt = DateTime.MinValue;
        private DateTime lastWriteTimeUtc = DateTime.MinValue;
        private readonly List<OverlayZone> zones = new List<OverlayZone>();
        private readonly HashSet<string> drawnTags = new HashSet<string>();

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "QuantDeskScannerOverlay";
                Description = "Visual-only overlay for Quant Desk scanner-owned FVG and final-boss zones.";
                IsOverlay = true;
                Calculate = Calculate.OnBarClose;
                IsSuspendedWhileInactive = false;
                FeedPath = DefaultFeedPath();
                RefreshSeconds = 5;
                MaxZones = 6;
                ShowLabels = true;
                OverlayMode = "Desk";
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < 1)
                return;

            RefreshFeedIfNeeded();
            DrawZones();
        }

        [NinjaScriptProperty]
        public string FeedPath { get; set; }

        [NinjaScriptProperty]
        public int RefreshSeconds { get; set; }

        [NinjaScriptProperty]
        public int MaxZones { get; set; }

        [NinjaScriptProperty]
        public bool ShowLabels { get; set; }

        [NinjaScriptProperty]
        public string OverlayMode { get; set; }

        private static string DefaultFeedPath()
        {
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(userProfile, "Documents", "New project", "tools", "automation", "scanner-zone-feed", FeedFileName);
        }

        private void RefreshFeedIfNeeded()
        {
            int seconds = Math.Max(1, RefreshSeconds);
            if ((DateTime.UtcNow - lastReadAt).TotalSeconds < seconds)
                return;

            lastReadAt = DateTime.UtcNow;
            try
            {
                if (string.IsNullOrWhiteSpace(FeedPath) || !File.Exists(FeedPath))
                    return;

                DateTime writeTime = File.GetLastWriteTimeUtc(FeedPath);
                if (writeTime <= lastWriteTimeUtc && zones.Count > 0)
                    return;

                string json = File.ReadAllText(FeedPath);
                List<OverlayZone> parsed = ParseZones(json);
                zones.Clear();
                zones.AddRange(parsed);
                lastWriteTimeUtc = writeTime;
            }
            catch (Exception error)
            {
                Print("QuantDeskScannerOverlay feed read skipped: " + error.Message);
            }
        }

        private void DrawZones()
        {
            int drawn = 0;
            HashSet<string> nextTags = new HashSet<string>();
            foreach (OverlayZone zone in zones)
            {
                if (drawn >= Math.Max(1, MaxZones))
                    break;
                if (zone.Lower <= 0 || zone.Upper <= 0 || zone.Upper < zone.Lower)
                    continue;

                Brush outline = BrushFromHex(zone.Outline, zone.Direction == "LONG" ? Brushes.LimeGreen : Brushes.IndianRed);
                Brush fill = BrushFromHex(zone.Fill, zone.Direction == "LONG" ? Brushes.DarkGreen : Brushes.DarkRed);
                Brush line = BrushFromHex(zone.Line, zone.Direction == "LONG" ? Brushes.LightGreen : Brushes.MistyRose);
                int opacity = Math.Max(5, Math.Min(35, zone.Opacity));
                int startBarsAgo = BarsAgoFor(zone.FormedAt);
                string tagBase = "QD_" + SanitizeTag(zone.Id);
                string zoneTag = tagBase + "_zone";
                string lineTag = tagBase + "_line";
                string labelTag = tagBase + "_label";

                Draw.Rectangle(
                    this,
                    zoneTag,
                    false,
                    startBarsAgo,
                    zone.Upper,
                    0,
                    zone.Lower,
                    outline,
                    fill,
                    opacity);

                Draw.HorizontalLine(
                    this,
                    lineTag,
                    zone.LineInSand,
                    line);
                nextTags.Add(zoneTag);
                nextTags.Add(lineTag);

                if (ShowLabels)
                {
                    double labelPrice = zone.Direction == "LONG" ? zone.Upper : zone.Lower;
                    Draw.Text(
                        this,
                        labelTag,
                        ZoneLabel(zone),
                        0,
                        labelPrice,
                        line);
                    nextTags.Add(labelTag);
                }

                drawn++;
            }

            foreach (string staleTag in drawnTags)
            {
                if (!nextTags.Contains(staleTag))
                    RemoveDrawObject(staleTag);
            }
            drawnTags.Clear();
            foreach (string tag in nextTags)
                drawnTags.Add(tag);
        }

        private int BarsAgoFor(string formedAt)
        {
            if (string.IsNullOrWhiteSpace(formedAt))
                return Math.Min(CurrentBar, 200);

            DateTime formed;
            if (!DateTime.TryParse(formedAt, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out formed))
                return Math.Min(CurrentBar, 200);

            for (int barsAgo = 0; barsAgo <= Math.Min(CurrentBar, 500); barsAgo++)
            {
                if (Time[barsAgo] <= formed)
                    return barsAgo;
            }

            return Math.Min(CurrentBar, 500);
        }

        private static string ZoneLabel(OverlayZone zone)
        {
            return string.Format(
                CultureInfo.InvariantCulture,
                "{0} {1} {2:0.00}-{3:0.00} | LIS {4:0.00}",
                zone.Direction == "LONG" ? "Bull" : "Bear",
                zone.Label,
                zone.Lower,
                zone.Upper,
                zone.LineInSand);
        }

        private List<OverlayZone> ParseZones(string json)
        {
            List<OverlayZone> parsed = new List<OverlayZone>();
            string arrayName = string.Equals(OverlayMode, "Debug", StringComparison.OrdinalIgnoreCase) ? "zones" : "displayZones";
            string zonesArray = ExtractArray(json, arrayName);
            if (string.IsNullOrWhiteSpace(zonesArray) && !string.Equals(arrayName, "zones", StringComparison.OrdinalIgnoreCase))
                zonesArray = ExtractArray(json, "zones");
            if (string.IsNullOrWhiteSpace(zonesArray))
                return parsed;

            foreach (string item in ObjectBlocks(zonesArray))
            {
                OverlayZone zone = new OverlayZone
                {
                    Id = StringValue(item, "id"),
                    Kind = StringValue(item, "kind"),
                    Direction = StringValue(item, "direction"),
                    SourceLabel = StringValue(item, "sourceLabel"),
                    Role = StringValue(item, "role"),
                    Lower = NumberValue(item, "lower"),
                    Upper = NumberValue(item, "upper"),
                    Midpoint = NumberValue(item, "midpoint"),
                    LineInSand = NumberValue(item, "lineInSand"),
                    FormedAt = StringValue(item, "formedAt"),
                    State = StringValue(item, "state"),
                    Label = StringValue(item, "label"),
                    Fill = StringValue(item, "fill"),
                    Outline = StringValue(item, "outline"),
                    Line = StringValue(item, "line"),
                    Opacity = (int)Math.Round(NumberValue(item, "opacity"))
                };

                if (string.IsNullOrWhiteSpace(zone.Label))
                    zone.Label = string.IsNullOrWhiteSpace(zone.SourceLabel) ? zone.Role : zone.SourceLabel;
                if (string.IsNullOrWhiteSpace(zone.Id))
                    zone.Id = zone.Direction + "_" + zone.Kind + "_" + zone.Lower.ToString(CultureInfo.InvariantCulture) + "_" + zone.Upper.ToString(CultureInfo.InvariantCulture);
                parsed.Add(zone);
            }

            return parsed;
        }

        private static string ExtractArray(string json, string propertyName)
        {
            string needle = "\"" + propertyName + "\"";
            int propertyIndex = json.IndexOf(needle, StringComparison.Ordinal);
            if (propertyIndex < 0)
                return null;

            int start = json.IndexOf('[', propertyIndex);
            if (start < 0)
                return null;

            int depth = 0;
            bool inString = false;
            bool escape = false;
            for (int i = start; i < json.Length; i++)
            {
                char c = json[i];
                if (escape)
                {
                    escape = false;
                    continue;
                }
                if (c == '\\' && inString)
                {
                    escape = true;
                    continue;
                }
                if (c == '"')
                    inString = !inString;
                if (inString)
                    continue;
                if (c == '[')
                    depth++;
                else if (c == ']')
                {
                    depth--;
                    if (depth == 0)
                        return json.Substring(start + 1, i - start - 1);
                }
            }

            return null;
        }

        private static IEnumerable<string> ObjectBlocks(string text)
        {
            int depth = 0;
            int start = -1;
            bool inString = false;
            bool escape = false;
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                if (escape)
                {
                    escape = false;
                    continue;
                }
                if (c == '\\' && inString)
                {
                    escape = true;
                    continue;
                }
                if (c == '"')
                    inString = !inString;
                if (inString)
                    continue;
                if (c == '{')
                {
                    if (depth == 0)
                        start = i;
                    depth++;
                }
                else if (c == '}')
                {
                    depth--;
                    if (depth == 0 && start >= 0)
                        yield return text.Substring(start, i - start + 1);
                }
            }
        }

        private static string StringValue(string json, string propertyName)
        {
            Match match = Regex.Match(json, "\"" + Regex.Escape(propertyName) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"");
            if (!match.Success)
                return null;
            return Regex.Unescape(match.Groups[1].Value);
        }

        private static double NumberValue(string json, string propertyName)
        {
            Match match = Regex.Match(json, "\"" + Regex.Escape(propertyName) + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
            if (!match.Success)
                return 0;
            double value;
            return double.TryParse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out value) ? value : 0;
        }

        private static string SanitizeTag(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return Guid.NewGuid().ToString("N");
            return Regex.Replace(value, "[^A-Za-z0-9_]+", "_");
        }

        private static Brush BrushFromHex(string hex, Brush fallback)
        {
            if (string.IsNullOrWhiteSpace(hex))
                return fallback;
            try
            {
                Brush brush = (Brush)new BrushConverter().ConvertFromString(hex);
                if (brush.CanFreeze)
                    brush.Freeze();
                return brush;
            }
            catch
            {
                return fallback;
            }
        }

        private class OverlayZone
        {
            public string Id { get; set; }
            public string Kind { get; set; }
            public string Direction { get; set; }
            public string SourceLabel { get; set; }
            public string Role { get; set; }
            public double Lower { get; set; }
            public double Upper { get; set; }
            public double Midpoint { get; set; }
            public double LineInSand { get; set; }
            public string FormedAt { get; set; }
            public string State { get; set; }
            public string Label { get; set; }
            public string Fill { get; set; }
            public string Outline { get; set; }
            public string Line { get; set; }
            public int Opacity { get; set; }
        }
    }
}
