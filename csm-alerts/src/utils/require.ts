import { RUN_TIER } from '../config'

export enum RedefineMode {
  Strict = 'strict',
  Merge = 'merge',
}

/**
 * Special wrapper under `require` function that allows to
 * redefine variables from a file with the same name and `.<tier>` suffix.
 * `<tier>` is a string that is passed by `FORTA_AGENT_RUN_TIER` environment variable.
 * @param module module object to get the path from.
 * @param path relative to module path to the main file to import.
 * @param mode `strict` or `merge`. Default: `strict`.
 */
export function requireWithTier<T>(module: NodeModule, path: string, mode: RedefineMode = RedefineMode.Strict): T {
  const defaultContent = require(`${module.path}/${path}`)
  if (!RUN_TIER) return defaultContent
  let tieredContent: any
  // NOTE: It fails if it can't find the requested tier.
  tieredContent = require(`${module.path}/${path}.${RUN_TIER}`)
  module.exports.__tier__ = RUN_TIER
  if (mode == RedefineMode.Strict) {
    const valid = (key: string) => {
      return key in tieredContent && typeof defaultContent[key] == typeof tieredContent[key]
    }
    if (Object.keys(defaultContent).every((key) => valid(key))) {
      return tieredContent
    } else {
      throw new Error(
        `Failed to import module: '${module.path}/${path}.${RUN_TIER}' doesn't contain all keys or unmatched types 
        with '${module.path}/${path}'`,
      )
    }
  }
  if (mode == RedefineMode.Merge) {
    const valid = (key: string) => {
      if (key in defaultContent) {
        return typeof defaultContent[key] == typeof tieredContent[key]
      } else {
        return true
      }
    }
    if (Object.keys(tieredContent).every((key) => valid(key))) {
      return { ...defaultContent, ...tieredContent }
    } else {
      throw new Error(`Failed to import module: '${path}.${RUN_TIER}' unmatched types with '${path}'`)
    }
  }
  throw new Error(`Unknown require mode: ${mode}`)
}
