export const toolboxOptions: Record<string, string> = {
  Default: 'Default',
  StaticText: 'StaticText',
  DynamicText: 'DynamicText',
  StaticPath: 'StaticPath',
  StaticVector: 'StaticVector',
  StaticImage: 'StaticImage',
  MultiElement: 'MultiElement',
  DynamicImage: 'DynamicImage',
  // fabric.js internal types that map to our toolbox items
  textbox: 'StaticText',
  'i-text': 'StaticText',
  text: 'StaticText',
  image: 'StaticImage',
  Video: 'StaticImage',
}

export const getContextMenuType = (selection: any): string | string[] => {
  const types = new Set<string>()
  if (!selection) {
    return 'Default'
  }
  if (selection._objects) {
    for (const object of selection._objects) {
      types.add(object.type)
    }
  } else {
    types.add(selection.type)
  }

  const typesArray = Array.from(types)

  if (typesArray.length === 1) {
    if (typesArray[0] === 'Background') {
      return 'Default'
    }
    return typesArray[0]
  }
  return typesArray
}

/** Resolve which toolbox item to show for the active selection's type.
 *  Falls back to 'Default' for unknown types (was previously undefined → blank). */
export function resolveToolboxKey(activeObjectType: string | string[]): string {
  if (Array.isArray(activeObjectType)) {
    return toolboxOptions['MultiElement']
  }
  return toolboxOptions[activeObjectType] || toolboxOptions['Default']
}
