import { globalLog } from '@/utils'
import {
    KeyPrefix,
    OPTION_MAP,
    RoadMaps,
    type Roadmap,
    type RoadmapCollection,
    STAT_KEY_MAP,
    type UserFriendlyRoadmap,
} from './Keys'

/** Path to custom roadmaps folder relative to FoundryVTT Data directory */
const CUSTOM_ROADMAPS_FOLDER = 'pf2e-creature-builder/custom-roadmaps'

/**
 * Registry for managing both built-in and custom roadmaps.
 * Provides a centralized API for all roadmap operations.
 *
 * Built-in roadmaps are available immediately on instantiation.
 * Custom roadmaps are loaded asynchronously and merged when ready.
 */
export class RoadMapRegistry {
    private static instance: RoadMapRegistry | null = null

    private readonly builtInRoadmaps: RoadmapCollection
    private customRoadmaps: RoadmapCollection = {}
    private _isReady: boolean = false

    private constructor() {
        // Clone built-in roadmaps to prevent mutation
        this.builtInRoadmaps = { ...RoadMaps }
    }

    /**
     * Get the singleton instance of RoadMapRegistry
     */
    public static getInstance(): RoadMapRegistry {
        if (!RoadMapRegistry.instance) {
            RoadMapRegistry.instance = new RoadMapRegistry()
        }
        return RoadMapRegistry.instance
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static resetInstance(): void {
        RoadMapRegistry.instance = null
    }

    /**
     * Whether custom roadmaps have been loaded
     */
    public get isReady(): boolean {
        return this._isReady
    }

    /**
     * Get all roadmaps (built-in + custom merged)
     * Custom roadmaps are added after built-in ones
     */
    public getAllRoadmaps(): RoadmapCollection {
        return { ...this.builtInRoadmaps, ...this.customRoadmaps }
    }

    /**
     * Get only built-in roadmaps
     */
    public getBuiltInRoadmaps(): RoadmapCollection {
        return { ...this.builtInRoadmaps }
    }

    /**
     * Get only custom roadmaps
     */
    public getCustomRoadmaps(): RoadmapCollection {
        return { ...this.customRoadmaps }
    }

    /**
     * Get a specific roadmap by key
     */
    public getRoadmap(key: string): Roadmap | undefined {
        return this.builtInRoadmaps[key] ?? this.customRoadmaps[key]
    }

    /**
     * Check if a roadmap key is a built-in roadmap
     */
    public isBuiltIn(key: string): boolean {
        return key in this.builtInRoadmaps
    }

    /**
     * Load custom roadmaps from the Data folder.
     * This method is async and non-blocking.
     * Call this in Hooks.on('ready') to avoid slowing down initialization.
     */
    public async loadCustomRoadmaps(): Promise<void> {
        if (this._isReady) {
            globalLog(false, 'Custom roadmaps already loaded')
            return
        }

        try {
            globalLog(false, 'Loading custom roadmaps...')

            // Check if FilePicker is available (FoundryVTT API)
            if (typeof FilePicker === 'undefined') {
                globalLog(
                    false,
                    'FilePicker not available, skipping custom roadmaps',
                )
                this._isReady = true
                return
            }

            // Try to browse the custom roadmaps folder
            let files: string[] = []
            try {
                const result = await FilePicker.browse(
                    'data',
                    CUSTOM_ROADMAPS_FOLDER,
                )
                files =
                    result.files?.filter((f: string) => f.endsWith('.json')) ||
                    []
            } catch {
                // Folder doesn't exist or is inaccessible - this is fine
                globalLog(
                    false,
                    `Custom roadmaps folder not found at ${CUSTOM_ROADMAPS_FOLDER} - no custom roadmaps will be loaded`,
                )
                this._isReady = true
                return
            }

            if (files.length === 0) {
                globalLog(false, 'No custom roadmap files found')
                this._isReady = true
                return
            }

            globalLog(false, `Found ${files.length} custom roadmap file(s)`)

            // Load each JSON file
            for (const filePath of files) {
                await this.loadRoadmapFile(filePath)
            }

            const customCount = Object.keys(this.customRoadmaps).length
            globalLog(false, `Loaded ${customCount} custom roadmap(s)`)
        } catch (error) {
            globalLog(true, 'Error loading custom roadmaps:', error)
        } finally {
            this._isReady = true
        }
    }

    /**
     * Load a single roadmap JSON file
     */
    private async loadRoadmapFile(filePath: string): Promise<void> {
        try {
            const response = await fetch(filePath)
            if (!response.ok) {
                globalLog(
                    true,
                    `Failed to fetch ${filePath}: ${response.status}`,
                )
                return
            }

            const data = await response.json()

            // Support both single roadmap and array of roadmaps
            const roadmaps: UserFriendlyRoadmap[] = Array.isArray(data)
                ? data
                : [data]

            for (const roadmapData of roadmaps) {
                this.processRoadmap(roadmapData, filePath)
            }
        } catch (error) {
            globalLog(true, `Error loading roadmap file ${filePath}:`, error)
        }
    }

    /**
     * Process and validate a single roadmap from JSON data
     */
    private processRoadmap(
        data: UserFriendlyRoadmap,
        sourceFile: string,
    ): void {
        // Validate required fields
        if (!this.validateRoadmap(data)) {
            globalLog(true, `Invalid roadmap format in ${sourceFile}:`, data)
            return
        }

        // Generate internal key from name
        const internalKey = `${KeyPrefix}.custom.${this.sanitizeName(data.name)}`

        // Check if this key would override a built-in roadmap
        if (this.isBuiltIn(internalKey)) {
            globalLog(
                true,
                `Custom roadmap "${data.name}" would override built-in roadmap - skipping`,
            )
            return
        }

        // Check if this key already exists in custom roadmaps
        if (internalKey in this.customRoadmaps) {
            globalLog(
                true,
                `Duplicate custom roadmap name "${data.name}" - skipping`,
            )
            return
        }

        // Translate to internal format
        const translated = this.translateUserFriendlyRoadmap(data)
        if (translated) {
            this.customRoadmaps[internalKey] = translated
            globalLog(false, `Loaded custom roadmap: ${data.name}`)
        }
    }

    /**
     * Validate that a roadmap object has the required structure
     */
    private validateRoadmap(data: unknown): data is UserFriendlyRoadmap {
        if (!data || typeof data !== 'object') {
            return false
        }

        const roadmap = data as Record<string, unknown>

        if (typeof roadmap.name !== 'string' || roadmap.name.trim() === '') {
            globalLog(true, 'Roadmap missing required "name" field')
            return false
        }

        if (
            !roadmap.statistics ||
            typeof roadmap.statistics !== 'object' ||
            Array.isArray(roadmap.statistics)
        ) {
            globalLog(true, 'Roadmap missing required "statistics" object')
            return false
        }

        return true
    }

    /**
     * Translate a user-friendly roadmap to the internal format
     */
    private translateUserFriendlyRoadmap(
        data: UserFriendlyRoadmap,
    ): Roadmap | null {
        const translated: Roadmap = {}
        let hasValidStats = false

        for (const [userKey, userValue] of Object.entries(data.statistics)) {
            // Look up the internal statistic key
            const statKey = STAT_KEY_MAP[userKey]
            if (!statKey) {
                globalLog(
                    true,
                    `Unknown statistic "${userKey}" in roadmap "${data.name}" - skipping this stat`,
                )
                continue
            }

            // Look up the internal option value
            const optionValue = OPTION_MAP[userValue.toLowerCase()]
            if (!optionValue) {
                globalLog(
                    true,
                    `Unknown option value "${userValue}" for "${userKey}" in roadmap "${data.name}" - skipping this stat`,
                )
                continue
            }

            translated[statKey] = optionValue
            hasValidStats = true
        }

        if (!hasValidStats) {
            globalLog(
                true,
                `Roadmap "${data.name}" has no valid statistics - skipping`,
            )
            return null
        }

        return translated
    }

    /**
     * Sanitize a roadmap name for use as an internal key
     */
    private sanitizeName(name: string): string {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
    }
}
