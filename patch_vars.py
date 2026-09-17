import os
path = "android/variables.gradle"
if os.path.exists(path):
    with open(path, "r") as f:
        content = f.read()
    if "rgcfaIncludeGoogle = true" not in content:
        content = content.replace("ext {", "ext {\n    rgcfaIncludeGoogle = true\n    rgcfaIncludeFacebook = false")
        with open(path, "w") as f:
            f.write(content)
        print("Patched variables.gradle")
