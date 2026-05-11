
import os

file_path = r"c:\Users\Shoxrux\Desktop\project\lexford-frontend-project (1)\app\coins\page.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'const [errorMessage, setErrorMessage]' in line and 'successMessage' not in ''.join(lines[max(0, lines.index(line)-5):lines.index(line)]):
        new_lines.append('  const [successMessage, setSuccessMessage] = useState<string | null>(null)\n')
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
