---
title: "Kitchen sink: every element an article can use"
description: "A draft-only fixture that exercises headings, code, tables, images, callouts and lists. Visible in dev and SHOW_DRAFTS=1 builds only."
date: 2026-11-01
tags: [fixture]
author: kile-research
repoPath: templates/article.md
draft: true
---
This draft is never published. It exists so designers and reviewers can check every element in one place.

## Text

A paragraph with **bold**, *italic*, `inline code` and a [link](/research/). Define a term in **bold** the first time it appears.

> **Heads-up:** callouts are Markdown blockquotes that start with a bold label.

1. Ordered item
2. Another item
   - Nested bullet

## Code

```python
def tokens_per_second(tokens: int, seconds: float) -> float:
    # Divide by the actual token count, not the requested one
    return tokens / seconds
```

```bash
ollama run qwen2.5:0.5b "Hello"
```

```
Plain output block without a language
```

## Tables

| Precision | Size | tok/s | A long column header that should not wrap awkwardly |
|---|---:|---:|---|
| Q4_K_M | 398 MB | 41.2 | Good default |
| FP16 | 994 MB | 19.8 | Highest quality, slowest |

## Images

![Sample figure: the Kile Research social card](./images/kitchen-sink-figure.png)

### A third-level heading

Final paragraph.
