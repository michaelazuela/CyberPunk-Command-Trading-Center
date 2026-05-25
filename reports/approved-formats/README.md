# Approved Report Formats

These are the source-of-truth visual references for report rendering.

- `approved-daily-trading-plan-format.png`: Daily trade plan chart markup render.
- `approved-weekly-trading-plan-format.png`: Weekly trading plan slide.
- `approved-weekly-news-format.png`: Weekly USA news risk board slide.

Workflow rules:

- Daily trade plan images are rendered through `tools/automation/chart-markup-renderer.ts`.
- Scanner and Discord workflows must use that renderer for chart-plan images.
- Weekly reports should use two slides: weekly trading plan and weekly news.
- Do not use old draft/mockup report images as approved formats.
- Keep decision-support language visible. No automated-order implication.
