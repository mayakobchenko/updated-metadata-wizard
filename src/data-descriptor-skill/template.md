<!--
EBRAINS data descriptor skeleton, section for section the same as
word_template.docx. Fill every section. The HTML comments carry the guidance
from the Word template; scripts/fill_word_template.py strips them, so they may
stay in the Markdown file. Angle-bracket placeholders must not survive.

Markdown the Word renderer understands:
- a line ending in a backslash is a hard line break (one author per line)
- ^1,2^ is a superscript (affiliation indices, citation numbers)
- ### headings inside a section become bold subheadings
- the directory tree is a fenced block starting with "/ repository-root",
  one entry per line, indented two spaces per level, with [description]
- tables are pipe tables; <br> inside a cell is a line break
- a figure is ![caption](relative/path.png) on its own line
-->

*Title: '<short label>' | version: <version>*

# DATA DESCRIPTOR

## TITLE

<!-- Maximum 110 characters including spaces. No colons and parentheses.
Descriptive of the presented data; avoid acronyms and abbreviations. -->

<full descriptive title>

## AUTHORS

<!-- Forename Surname^1^, Forename Surname^1^, and Forename Surname^2^;
the superscripts index the affiliations below. -->

<First Last^1^, First Last^2^, …>

### AFFILIATIONS

<!-- One numbered entry per institution. Format examples:
1. Institute (working group) department, university, city, country
2. Department, organization, city, country -->

1. <institution>
2. <institution>

### CORRESPONDING AUTHOR(S)

<!-- The person with most detailed knowledge about the data and the primary
contact for questions. Format: Forename Surname: email@address, one per line,
each line but the last ending in a backslash. -->

<Forename Surname>: <email@address>

## SUMMARY

<!-- Maximum 220 words, no references. Summarise the content, provenance and
usage potential of the shared data: subjects, specimen type, data modality,
processing applied, intended reuse. Example structure: one sentence on the
origin of the dataset; one or two sentences on what it contains and how it was
acquired; one sentence on what it can be used for. -->

<one paragraph>

## VERSION SPECIFICATIONS

<!-- Specifications or highlights of this dataset version, e.g. "This dataset
contains X subjects / Y sessions"; for a later version, what changed since the
previous one. Subject and session counts come from the file listing. -->

<first release, or what changed since the previous version>

## MATERIALS AND METHODS

<!-- Describe the materials and methods used to generate the data: specimens,
acquisition equipment and parameters, experimental procedure and stimuli,
processing and analysis. Previous methodological descriptions may be cited
instead of repeated. Anatomical information: where applicable, give the entity
the data belongs to (species, brain region, coordinates, atlas and version).
The subsections below are a default; rename or replace them to fit the domain
(see domains/*.md). Figures: ![**Figure N:** caption](figureN.png) -->

### Subjects / Animals

### Equipment and acquisition parameters

### Experimental procedure and stimuli

### Processing and analysis

## USAGE NOTES

<!-- How the shared data can be reused and how they should not be reused
(limitations, caveats, units, conversions). Software or code that opens the
data: loading routines, analysis packages, with versions. License. -->

<reuse caveats, required software versions, units, limitations, license>

## DATA RECORDS

<!-- How the data are stored, file types and content. See
reference/data-records-guide.md.
1. Directory tree: a fenced block rooted at "/ repository-root", with an
   inline [description] after each entry.
2. Format table with the header
   | Format | Extension | Software used / file specification |
   one row per extension; the third column names the producing software or
   script, standard or self made, stored units and conversions.
3. Filename-code legend, when filenames encode metadata.
4. Container-file contents, when data sits inside container files. -->

The data are stored in the following structure:

```
/ repository-root
  <file>                           [<description>]
  <folder>/                        [<description>]
    <file>                         [<description>]
```

| Format | Extension | Software used / file specification |
|--------|-----------|------------------------------------|
| <format name> | <ext> | <software or script>; <files of this kind and their content> |

## Acknowledgements

<!-- Non-author contributors and funding, including grant name and number. -->

<funding sources and grant numbers>

## Author contributions

<!-- Each author's contribution on a separate line, each line but the last
ending in a backslash:
author X: data analysis\
author Y: image acquisition, data analysis -->

<per-author roles>

## REFERENCES

<!-- Bibliographic information for all literature cited above, numbered in
citation order, with DOIs. -->

1. <citation>
