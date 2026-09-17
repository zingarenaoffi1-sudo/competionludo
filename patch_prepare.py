import os
import re

path = "prepare-android.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add code to patch variables.gradle
vars_patch = """
    vars_path = "android/variables.gradle"
    if os.path.exists(vars_path):
        with open(vars_path, "r", encoding="utf-8") as f:
            vars_content = f.read()
        if "rgcfaIncludeGoogle" not in vars_content:
            vars_content = vars_content.replace("ext {", "ext {\\n    rgcfaIncludeGoogle = true\\n    rgcfaIncludeFacebook = false")
            with open(vars_path, "w", encoding="utf-8") as f:
                f.write(vars_content)
"""

if "vars_path = \"android/variables.gradle\"" not in content:
    content = content.replace('if __name__ == "__main__":', vars_patch + '\nif __name__ == "__main__":')
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added variables.gradle patch to prepare-android.py")
else:
    print("Already patched")
