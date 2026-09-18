import os

path = "competition.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_code = '} else if (errorMsg.includes("wrong-password") || errorMsg.includes("invalid-credential")) {'
new_code = '} else if (errorMsg.includes("wrong-password") || errorMsg.includes("invalid-credential") || errorMsg.includes("credential is incorrect") || errorMsg.includes("malformed")) {'

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched competition.js error handling")
else:
    print("Code not found")
