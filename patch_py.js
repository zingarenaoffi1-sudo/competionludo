const fs = require('fs');
let code = fs.readFileSync('prepare-android.py', 'utf8');

code = code.replace(
    /Thread\.setDefaultUncaughtExceptionHandler\(\(thread, throwable\) -> \{[\s\S]*?\}\);/g,
    '// Removed UncaughtExceptionHandler'
);

fs.writeFileSync('prepare-android.py', code);
console.log("Patched prepare-android.py");
