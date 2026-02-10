export type ItemData = {
    name: string
    type: Item.SubType
} & Record<string, unknown>
