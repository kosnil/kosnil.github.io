import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const links = z.object({
  label: z.string(),
  url: z.url()
});

const papers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/papers" }),
  schema: z.object({
    title: z.string(),
    year: z.number().int(),
    status: z.enum(["published", "preprint", "dissertation"]),
    venue: z.string(),
    panelVenue: z.string().optional(),
    authors: z.array(z.string()).default([]),
    paperUrl: z.url(),
    codeUrl: z.url().optional(),
    links: z.array(links),
    visualization: z.enum(["random-forest", "thesis", "forecast", "supermask", "none"]).default("none"),
    abstractLabel: z.string().default("Abstract"),
    order: z.number().int(),
    draft: z.boolean().default(false)
  })
});

const cvEntry = z.object({
  period: z.string(),
  title: z.string(),
  detail: z.string()
});

const cv = defineCollection({
  loader: glob({ pattern: "**/*.{yml,yaml}", base: "./src/content/cv" }),
  schema: z.object({
    groups: z.array(z.object({
      heading: z.string(),
      entries: z.array(cvEntry).optional(),
      notes: z.array(z.string()).optional()
    }))
  })
});

const teaching = defineCollection({
  loader: glob({ pattern: "**/*.{yml,yaml}", base: "./src/content/teaching" }),
  schema: z.object({
    intro: z.string(),
    courses: z.array(z.object({
      title: z.string(),
      period: z.string(),
      role: z.string(),
      url: z.url()
    }))
  })
});

export const collections = { papers, cv, teaching };
