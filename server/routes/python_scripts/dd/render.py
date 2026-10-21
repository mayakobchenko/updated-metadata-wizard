#!/usr/bin/env python3
"""Runs the skill's fill_word_template.py unchanged, except that the running header shows the short title
without quotation marks (Title: Short title | version: 1). Same arguments as fill_word_template.py."""
import sys

import fill_word_template as skill


def set_running_header_without_quotes(doc, descriptor):
    text = f"Title: {descriptor.short_title} | version: {descriptor.version}"
    replaced = False
    for section in doc.sections:
        for paragraph in section.header.paragraphs:
            if "version:" not in paragraph.text:
                continue
            runs = [run for run in paragraph.runs if run.text]
            runs[0].text = text
            for run in runs[1:]:
                run.text = ""
            replaced = True
    if not replaced:
        raise ValueError("the Word template has no running header with 'version:'")


skill.set_running_header = set_running_header_without_quotes

if __name__ == "__main__":
    sys.exit(skill.main())
