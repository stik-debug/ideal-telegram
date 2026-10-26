# Signup / dashboard null-handler fix

## Reported issue
After registration, the dashboard displayed `Cannot set properties of null (setting 'onclick')`.

## Change
- Guarded direct event-handler assignments in the client so a conditional or dynamically-rendered control that is not present cannot crash the entire dashboard initialization.
- Added a dedicated **Back to courses** recovery button to the dashboard error screen, in addition to **Try again**.
- Kept the existing signup/login flow and database unchanged.

## Validation
- `node --check public/app.js` passed.
- `npm test`: 15 tests passed, 0 failed.
- ZIP integrity checked after packaging.

These automated tests do not replace a real-browser smoke test on the deployed hosting environment. Back up the production database before deployment and retain the existing persistent database/environment settings.
