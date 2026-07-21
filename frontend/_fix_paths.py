import pathlib

# Files to restore from git
git_files = [
    'src/app/(auth)/cart/page.tsx',
    'src/app/(auth)/order/list/page.tsx',
    'src/components/guards/AuthGuard.tsx',
]
# New files to fix in-place
new_files = [
    'src/app/admin/layout.tsx',
    'src/components/AdminHeader.tsx',
]

import subprocess, os

os.chdir(pathlib.Path(__file__).parent)

# Restore tracked files
for f in git_files:
    result = subprocess.run(['git', 'checkout', '--', f], capture_output=True, text=True)
    if result.returncode == 0:
        print(f'Restored: {f}')
    else:
        print(f'Failed to restore {f}: {result.stderr}')

# Now do proper replacement (preserve newlines) on all files
all_files = git_files + new_files
for f in all_files:
    p = pathlib.Path(f)
    if not p.exists():
        print(f'Skipping (not found): {f}')
        continue
    content = p.read_text(encoding='utf-8')
    # Replace /auth/login with /login in string literals (quotes or backticks)
    new_content = content.replace("'/auth/login", "'/login")
    new_content = new_content.replace('`/auth/login', '`/login')
    p.write_text(new_content, encoding='utf-8')
    print(f'Fixed redirects in: {f}')
