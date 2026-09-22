# Nils Koster — academic website

This repository contains the source for [kosnil.github.io](https://kosnil.github.io/).

## Edit the CV

Open `src/content/cv/cv.yml`, edit the relevant entry, and commit the change. The public CV is intentionally shorter than a full application CV.

## Add a paper

1. Duplicate one file in `src/content/papers/`.
2. Change the fields at the top and paste the abstract below the second `---`.
3. Set `status` to `published`, `preprint`, or `dissertation`.
4. Use `draft: true` to keep an entry out of the public site.
5. Set `visualization: none` unless a matching visualization component has been added.

Entries are sorted by `order`. A push to `main` automatically rebuilds and publishes the site.

## Local development

```sh
npm install
npm run dev
```

Run `npm run build` before committing substantive changes.
