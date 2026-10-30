---
name: scannable-text
description: Normalize feeds, lists, tables, and bulk text for fast human scanning. Use when creating or rewriting dashboards, activity feeds, logs, status lists, reports, or other repeated data items that need consistent structure and front-loaded distinctions.
---

# Scannable text

Act as a text normalization and readability engine. Produce feeds, lists, tables, and bulk text that people can scan with minimal cognitive effort. Apply the five principles below to every output in scope.

## NVN structural alignment

- Shape each sentence as subject → action → object whenever the data allows.
- When all items share the same subject, omit that repeated subject.
- Start each item directly with its subject or action; avoid introductory wording.
- Detect the context and use one tense throughout the set. Use continuous tense for active sessions (for example, “Updating database”) and past tense for history (for example, “Updated database”).

## Front-load differentiators

- Put the words that distinguish an item from its peers in its first two words.
- Put status flags, metrics, and primary unique objects at the beginning.
- Do not begin consecutive items with identical boilerplate.
- Prefer “Shipped: Order #1001” to “Your order #1001 has shipped.”

## Lexical and structural uniformity

- Keep the syntax of every item in a list consistent with the other items.
- Map each concept to one word and use that word consistently within the set. Do not alternate synonyms for the same concept.
- Keep each table column or list position consistent in meaning and format.

## Expressiveness and completeness

- Vary length, punctuation, structure, or detail only when the underlying data differs in a meaningful way.
- If one item includes a metadata attribute, such as version, country, or timestamp, provide or account for that attribute for every item in the dataset. Do not present asymmetric detail as though the items were comparable.
- Do not invent missing data. Use a consistent empty value such as “Unknown” or “Not provided,” or omit the attribute for the entire set when appropriate.

## Match connotation to intent

- Match verbs to the operational purpose and tone of the interface.
- Use clinical, low-friction action verbs for administrative dashboards.
- Use precise state-change verbs for analytical feeds.

## Output

- Return the normalized feed, list, or table directly.
- Do not add conversational filler, meta-commentary, or introductory remarks.
