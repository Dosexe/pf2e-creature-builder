import {actorFields, DefaultCreatureStatistics, Levels, Statistics, Skills, Options, RoadMaps} from "./Keys";
import {statisticValues, detectStatLevel, detectHPLevel} from "./Values";
import type {BaseActor} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs";


export class MonsterMaker extends FormApplication {
    data = DefaultCreatureStatistics
    level = "-1"
    private readonly _uniqueId: string

    constructor(object: any, options?: any) {
        super(object, options);
        // Generate unique ID at construction time to prevent form caching
        this._uniqueId = `monsterMakerForm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log("MonsterMaker constructor - object:", object, "this.object:", this.object);
    }

    // Getter to always get fresh actor reference from this.object
    get actor(): BaseActor {
        return this.object as BaseActor;
    }

    set actor(value: BaseActor) {
        this.object = value;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(FormApplication.defaultOptions, {
            classes: ["form"],
            popOut: true,
            template: `modules/mycustom-module/dist/forms/monsterMakerForm.html`,
            id: "monsterMakerForm",
            title: "Monster Maker Form",
            height: 833,
            width: 400
        });
    }

    // Override to make the form ID unique - prevents caching
    get id() {
        return this._uniqueId;
    }

    applyName(formData: object) {
        const name = formData[Statistics.name] ? formData[Statistics.name] : this.actor.name
        return {"name": name}
    }

    applyTraits(formData: object) {
        const traitsString = formData["PF2EMONSTERMAKER.traits"];
        if (traitsString && traitsString.trim() !== '') {
            const traits = traitsString.split(',').map((t: string) => t.trim().toLowerCase()).filter((t: string) => t !== '');
            return {"system.traits.value": traits}
        }
        return {}
    }

    applyLevel() {
        return {"system.details.level.value": parseInt(this.level, 10)}
    }

    applyHitPoints(formData: object) {
        const option = formData[Statistics.hp]
        const hitPoints = parseInt(statisticValues[Statistics.hp][this.level][option], 10)
        return {"system.attributes.hp.value": hitPoints}
    }

    applyStrike(formData: object) {
        const strikeBonusOption = formData[Statistics.strikeBonus]
        const strikeDamageOption = formData[Statistics.strikeDamage]
        const strikeBonus = parseInt(statisticValues[Statistics.strikeBonus][this.level][strikeBonusOption], 10)
        const strikeDamage = statisticValues[Statistics.strikeDamage][this.level][strikeDamageOption]
        const strike = {
            // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
            name: game["i18n"].localize("PF2EMONSTERMAKER.strike"),
            type: 'melee',
            system: {
                damageRolls: {
                    strikeDamageID: {
                        damage: strikeDamage,
                        damageType: 'bludgeoning',
                        category: null
                    },
                },
                bonus: {
                    value: strikeBonus,
                },
            },
        };
        return Item.create(strike, {parent: this.actor})
    }

    applySpellcasting(formData: object) {
        const spellcastingOption = formData[Statistics.spellcasting]
        if (spellcastingOption === Options.none) {
            return;
        }
        const spellcastingBonus = parseInt(statisticValues[Statistics.spellcasting][this.level][spellcastingOption], 10)
        const spellcasting = {
            // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
            name: game["i18n"].localize("PF2EMONSTERMAKER.spellcasting"),
            type: "spellcastingEntry",
            system: {
                spelldc: {
                    value: spellcastingBonus,
                    dc: spellcastingBonus+8,
                },
                tradition: {
                    value: 'arcane',
                },
                prepared: {
                    value: 'innate',
                },
                showUnpreparedSpells: { value: true },
            }
        };
        return Item.create(spellcasting, {parent: this.actor})
    }

    async applySkills(formData: object) {
        for(const skillName of Skills) {
            const option = formData[skillName]
            if (option !== Options.none) {
                const value = parseInt(statisticValues[skillName][this.level][option], 10)
                const skill = `system.skills.${skillName.split('.')[1].toLowerCase()}`;
                await this.actor.update(foundry.utils.flattenObject({[skill]: {base: value}}));
            }
        }
    }

    async applyLoreSkills(formData: object) {
        // Find all lore skills in the form data
        const loreSkills: {name: string, option: string}[] = [];
        for (const key of Object.keys(formData)) {
            if (key.startsWith('loreName')) {
                const id = key.replace('loreName', '');
                const name = formData[`loreName${id}`];
                const levelOption = formData[`loreLevel${id}`];
                if (name && name.trim() !== '' && levelOption !== Options.none) {
                    loreSkills.push({ name: name.trim(), option: levelOption });
                }
            }
        }

        // Create each lore skill as an item (PF2e stores lore skills as items of type "lore")
        for (const lore of loreSkills) {
            const value = parseInt(statisticValues[Statistics.acrobatics][this.level][lore.option], 10);
            const loreItem = {
                name: `${lore.name} Lore`,
                type: 'lore',
                system: {
                    mod: {
                        value: value
                    }
                }
            };
            await Item.create(loreItem, { parent: this.actor });
        }
    }

    // Detect senses from the source actor
    // Senses structure: { acuity, emphasizeLabel, label, range, source, type }
    detectSenses(): Array<object> {
        return  foundry.utils.getProperty(this.actor, 'system.perception.senses');
    }

    applySenses(senses: Array<object>) {
        if (!senses || senses.length === 0) {
            return {};
        }

        return { "system.perception.senses": senses };
    }

    applyMovement(movement: object) {
        if (!movement || Object.keys(movement).length === 0) {
            return {};
        }
        
        return movement;
    }

    protected async _updateObject(_event: Event, formData?: object) {
        if(formData) {
            // Validate and set level
            const formLevel = String(formData[Statistics.level]);
            this.level = Levels.includes(formLevel) ? formLevel : '1';
            console.log("Monster Maker Submit - Level:", this.level, "Form data:", formData);
            
            // Always create a new actor - Monster Maker creates new creatures
            const newActorData = {
                name: formData[Statistics.name] || "New Monster",
                type: "npc",
            };
            const newActor = await Actor.create(newActorData);
            if (!newActor) {
                console.error("Failed to create new actor");
                return;
            }
            
            const updateData = {}
            for(const key of Object.keys(formData)) {
                if(actorFields[key]) {
                    const actorField = actorFields[key]
                    const option = formData[key]
                    if (statisticValues[key]?.[this.level]?.[option] !== undefined) {
                        updateData[actorField] = parseInt(statisticValues[key][this.level][option], 10)
                    }
                }
            }
            Object.assign(updateData, this.applyName(formData))
            Object.assign(updateData, this.applyLevel())
            Object.assign(updateData, this.applyTraits(formData))
            // Apply senses and speeds from original actor
            Object.assign(updateData, this.applySenses(foundry.utils.getProperty(this.actor, 'system.perception.senses')))
            Object.assign(updateData, this.applyMovement(foundry.utils.getProperty(this.actor, 'system.attributes.movement')))
            await newActor.update(updateData);
            
            // Store original actor reference and use new actor for item creation
            const originalActor = this.actor;
            this.actor = newActor;
            await this.actor.update(this.applyHitPoints(formData))
            await this.applyStrike(formData)
            await this.applySpellcasting(formData)
            await this.applySkills(formData)
            await this.applyLoreSkills(formData)
            this.actor = originalActor;
            
            // Open the new actor's sheet
            newActor.sheet?.render(true);
        }
    }

    // Detect current actor stats and return detected Options for each statistic
    detectActorStats(): {[key: string]: Options} {
        const detected: {[key: string]: Options} = {};
        
        // Get actor level
        const actorLevel = String(foundry.utils.getProperty(this.actor, 'system.details.level.value') ?? 1);
        const clampedLevel = Levels.includes(actorLevel) ? actorLevel : '1';
        
        // Detect ability scores
        const abilityStats = [Statistics.str, Statistics.dex, Statistics.con, Statistics.int, Statistics.wis, Statistics.cha];
        for (const stat of abilityStats) {
            const path = actorFields[stat];
            const value = foundry.utils.getProperty(this.actor, path);
            if (value !== undefined && value !== null) {
                detected[stat] = detectStatLevel(stat, clampedLevel, Number(value));
            }
        }
        
        // Detect HP
        const hp = foundry.utils.getProperty(this.actor, 'system.attributes.hp.max');
        if (hp !== undefined && hp !== null && Number(hp) > 0) {
            detected[Statistics.hp] = detectHPLevel(clampedLevel, Number(hp));
        }
        
        // Detect Perception
        const perception = foundry.utils.getProperty(this.actor, 'system.perception.mod');
        if (perception !== undefined && perception !== null) {
            detected[Statistics.per] = detectStatLevel(Statistics.per, clampedLevel, Number(perception));
        }
        
        // Detect AC
        const ac = foundry.utils.getProperty(this.actor, 'system.attributes.ac.value');
        if (ac !== undefined && ac !== null && Number(ac) > 0) {
            detected[Statistics.ac] = detectStatLevel(Statistics.ac, clampedLevel, Number(ac));
        }
        
        // Detect Saves
        const saveStats = [
            {stat: Statistics.fort, path: 'system.saves.fortitude.value'},
            {stat: Statistics.ref, path: 'system.saves.reflex.value'},
            {stat: Statistics.wil, path: 'system.saves.will.value'}
        ];
        for (const save of saveStats) {
            const value = foundry.utils.getProperty(this.actor, save.path);
            if (value !== undefined && value !== null) {
                detected[save.stat] = detectStatLevel(Statistics.per, clampedLevel, Number(value)); // Uses same scale as perception
            }
        }
        
        // Detect Skills
        for (const skillStat of Skills) {
            const skillKey = skillStat.split('.')[1].toLowerCase();
            const skillValue = foundry.utils.getProperty(this.actor, `system.skills.${skillKey}.base`) 
                           ?? foundry.utils.getProperty(this.actor, `system.skills.${skillKey}.value`);
            if (skillValue !== undefined && skillValue !== null && Number(skillValue) > 0) {
                detected[skillStat] = detectStatLevel(skillStat, clampedLevel, Number(skillValue));
            }
        }
        
        // Detect Spellcasting (check if actor has any spellcasting entries)
        const items = this.actor.items;
        if (items) {
            for (const item of items) {
                if (item.type === 'spellcastingEntry') {
                    const spellDC = foundry.utils.getProperty(item, 'system.spelldc.dc') 
                                ?? foundry.utils.getProperty(item, 'system.spelldc.value');
                    if (spellDC) {
                        // DC is typically attack + 8, so we check the attack value
                        const attackValue = Number(spellDC) - 8;
                        detected[Statistics.spellcasting] = detectStatLevel(Statistics.spellcasting, clampedLevel, attackValue);
                        break;
                    }
                }
            }
        }
        
        return detected;
    }
    
    // Detect existing traits on the actor
    detectTraits(): string[] {
        const traits = foundry.utils.getProperty(this.actor, 'system.traits.value');
        if (Array.isArray(traits)) {
            return traits;
        }
        return [];
    }
    
    // Detect existing lore skills (stored as items in PF2e)
    detectLoreSkills(): {name: string, level: Options}[] {
        const loreSkills: {name: string, level: Options}[] = [];
        const actorLevel = String(foundry.utils.getProperty(this.actor, 'system.details.level.value') ?? 1);
        const clampedLevel = Levels.includes(actorLevel) ? actorLevel : '1';
        
        // In PF2e, Lore skills are stored as items with type "lore"
        const items = this.actor["items"];
        if (items) {
            for (const item of items) {
                if (item.type === 'lore') {
                    const loreName = item.name?.replace(' Lore', '').replace(/ \(.*\)$/, '') || 'Unknown';
                    const modValue = foundry.utils.getProperty(item, 'system.mod.value') ?? 0;
                    if (modValue > 0) {
                        const level = detectStatLevel(Statistics.acrobatics, clampedLevel, Number(modValue));
                        loreSkills.push({ name: loreName, level });
                    }
                }
            }
        }
        return loreSkills;
    }

    // @ts-expect-error
    getData() {
        console.log("=== MonsterMaker getData() ===");
        console.log("this.object:", this.object);
        console.log("this.actor:", this.actor);
        console.log("this.actor?.name:", (this.actor as any)?.name);
        console.log("this.actor?.system:", (this.actor as any)?.system);
        console.log("Level raw:", foundry.utils.getProperty(this.actor, 'system.details.level.value'));
        
        Handlebars.registerHelper('json', (context) => JSON.stringify(context));
        
        // Detect current actor stats
        const detectedStats = this.detectActorStats();
        const detectedTraits = this.detectTraits();
        const detectedLoreSkills = this.detectLoreSkills();
        const actorLevel = String(foundry.utils.getProperty(this.actor, 'system.details.level.value') ?? 1);
        
        console.log("actorLevel:", actorLevel);
        console.log("detectedStats:", detectedStats);
        console.log("=== End getData() ===");
        
        return {
            "CreatureStatistics": JSON.parse(JSON.stringify(this.data)), 
            "Levels": Levels, 
            "RoadMaps": RoadMaps, 
            "name": this.actor.name,
            "detectedStats": detectedStats,
            "detectedTraits": detectedTraits,
            "detectedLoreSkills": detectedLoreSkills,
            "actorLevel": actorLevel
        }
    }

}