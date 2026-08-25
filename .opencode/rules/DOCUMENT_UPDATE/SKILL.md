# Skill: Document Updater - Inventory Management ERP/POS System

**Last Updated**: August 24, 2026  
**Version**: 1.1

---

## Overview
Ensure system documentation remains accurate and up-to-date in `./document` after completing every work session.

---

## Session Completion Workflow

At the end of each session, review the work done and execute the appropriate update rules below.

### 1. New & Updated Features
- **Check Existing Documentation**: Look inside `./document` to see if a file already exists for the implemented feature.
- **If Existing**: Update the modification date and update/expand the description to reflect the latest changes.
- **If New**: Create a new documentation file under `./document` detailing the feature's architecture, specs, and usage.

### 2. Bug Fixes & Issues
- **Match Related Files**: Search `./document` for documentation corresponding to the component or module involved in the bug fix.
- **If Related File Exists**: Update the documentation to reflect any root cause insights, behavioral fixes, or procedural adjustments.
- **If No Related File Exists**: Skip updating documentation for minor bug fixes that do not affect existing spec docs.