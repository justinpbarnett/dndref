# Changelog

All notable changes to DnD Ref are documented here.

## [Unreleased]

### Added
- Per-source SRD selection in Settings (enable/disable specific SRD sources)
- Dark/light/system color scheme toggle in Settings
- Error banner in session controls for STT errors
- OG meta tags and social preview images
- Comprehensive Playwright e2e test suite with voice mock

### Fixed
- Synchronized theme across all pages
- Hydration flicker on web (localStorage read now synchronous)
- Fixed em-dash usage in commit messages (now uses commas/periods)

### Changed
- Improved contrast ratios for accessibility
- Added tab bar icons

## [0.1.0] - 2024

### Added
- Initial release
- Multi-provider entity loading (SRD, Kanka, Notion, Homebrewery, Google Docs, File Upload)
- Real-time speech-to-text (Web Speech API on web, Deepgram on native)
- Fuzzy entity detection using Fuse.js
- Card stack with pin/dismiss (max 6 cards)
- Sample world data
- AI parser for converting notes to entities (requires Anthropic API key)
