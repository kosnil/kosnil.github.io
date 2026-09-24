# Nils Koster — academic website

This repository contains the source for [kosnil.github.io](https://kosnil.github.io/).

## Edit the CV

Open `src/content/cv/cv.yml`, edit the relevant entry, and commit the change. The public CV is intentionally shorter than a full application CV.

## Edit teaching

Open `src/content/teaching/teaching.yml` to change the introduction or add courses. Each course has a `title`, `period`, `role`, and `url`. List selected past contributions with their semester; do not imply that an old course is currently offered.

## Add a paper or project

1. Duplicate one file in `src/content/papers/`.
2. Change the fields at the top and paste the abstract below the second `---`.
3. Set `status` to `published`, `preprint`, or `dissertation`.
4. Use `draft: true` to keep an entry out of the public site.
5. Set `visualization: none` unless a matching visualization component has been added.

Entries are sorted by `order`. A push to `main` automatically rebuilds and publishes the site.

Add extra resources under `links`, for example:

```yaml
links:
  - label: Paper
    url: https://doi.org/your-paper
  - label: Platform
    url: https://energy-arena.org/
```

These links appear in the publication row and in its **learn more** panel. The row omits the `paperUrl` destination because the title already links to it, and shows each other URL only once. Use labels such as `Code`, `Platform`, or `Data`; row labels appear in lowercase. Existing `codeUrl` entries remain supported as a fallback, so there is no need to edit older papers. Links wrap when space is limited.

## Publishing

Keep **Settings → Pages → Build and deployment → Source** set to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds the Astro website and publishes its output after each push to `main`.

Do not select **Deploy from a branch**: the repository root contains source files and the README, not the built website. That setting starts a separate Jekyll deployment which can overwrite the Astro site with the README.

## Local development

```sh
npm install
npm run dev
```

Run `npm run build` before committing substantive changes.
