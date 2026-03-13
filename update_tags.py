#!/usr/bin/env python3
"""One-time script to add mid-career and pro-speaker tags to cards.csv"""

# Cards that should remain senior-dev only (no mid-career)
senior_only = {
    "When _ broke production",
    "_: a post-mortem",
    "_: lessons from _ months in production",
    "My _ is slow. Make it faster!",
    "Scaling _ when you only have _ developers",
    "How we shipped _ with nothing but _ and determination",
    "Modernising _: wrapping a _ year old codebase",
    "The long goodbye to _",
    "Migrating from _ to _ while everything is on fire",
    "We thought _ would solve our _ problem. We were wrong.",
    "_: five years later",
}

# Cards for experienced/pro speakers
pro_speaker = {
    "_ considered harmful: a talk about _",
    "Falsehoods programmers believe about _",
    "_ is not dead and I will die on this hill",
    "Stop using _ and start using _ instead",
    "The case against _ in your _",
    "_: a cautionary tale",
    "_: what we got wrong",
    "_: the director's cut",
    "Code review of _ engineers",
}

TAG_ORDER = ['new-speaker', 'mid-speaker', 'pro-speaker', 'early-career', 'mid-career', 'senior-dev']

def order_tags(tags):
    ordered = [t for t in TAG_ORDER if t in tags]
    for t in tags:
        if t not in ordered:
            ordered.append(t)
    return ordered

with open('cards.csv', 'r') as f:
    lines = f.readlines()

new_lines = [lines[0]]

for line in lines[1:]:
    stripped = line.strip()
    if not stripped:
        continue

    if stripped.startswith('"'):
        i = 1
        while i < len(stripped):
            if stripped[i] == '"' and i + 1 < len(stripped) and stripped[i+1] == '"':
                i += 2
            elif stripped[i] == '"':
                break
            else:
                i += 1
        template = stripped[1:i].replace('""', '"')
        tags_str = stripped[i+2:].strip() if i+2 < len(stripped) else ''
    else:
        parts = stripped.split(',', 1)
        template = parts[0]
        tags_str = parts[1].strip() if len(parts) > 1 else ''

    tags = set(tags_str.split()) if tags_str else set()

    # If has senior-dev but NOT early-career, and not in senior_only -> add mid-career
    if 'senior-dev' in tags and 'early-career' not in tags and template not in senior_only:
        tags.add('mid-career')

    # If template is in pro_speaker list -> add pro-speaker
    if template in pro_speaker:
        tags.add('pro-speaker')

    quoted = '"' + template.replace('"', '""') + '"'
    new_lines.append(quoted + ',' + ' '.join(order_tags(tags)) + '\n')

with open('cards.csv', 'w') as f:
    f.writelines(new_lines)

# Report
tag_counts = {}
total = 0
with open('cards.csv', 'r') as f:
    next(f)
    for line in f:
        s = line.strip()
        if not s:
            continue
        total += 1
        if s.startswith('"'):
            i = 1
            while i < len(s):
                if s[i] == '"' and i+1 < len(s) and s[i+1] == '"':
                    i += 2
                elif s[i] == '"':
                    break
                else:
                    i += 1
            tags_str = s[i+2:].strip() if i+2 < len(s) else ''
        else:
            parts = s.split(',', 1)
            tags_str = parts[1].strip() if len(parts) > 1 else ''
        for t in tags_str.split():
            tag_counts[t] = tag_counts.get(t, 0) + 1

print(f"Total cards: {total}")
print("Tag distribution:")
for t in TAG_ORDER:
    print(f"  {t}: {tag_counts.get(t, 0)} cards")
