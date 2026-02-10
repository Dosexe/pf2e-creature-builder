# fvtt-module-pf2e-CreatureBuilderForm

This is forked from the [pf2e-monster-maker](https://github.com/mikolajg-tt/pf2e-monster-maker). Thanks to the creator **mikolajg-tt** for the solid foundation and great work on the original module.

The download link: https://github.com/dosexe/pf2e-creature-builder/releases/latest/download/module.json

A Foundry VTT module designed for Pathfinder 2E System, that allows you to create combat NPCs from scratch or from existing creature, using values from the [Pathfinder 2e Building Creatures Guide](https://2e.aonprd.com/Rules.aspx?ID=995)

Main differences from the original module:
 - Added support for all official roadmaps as defined in the [Pathfinder 2e rules](https://2e.aonprd.com/Rules.aspx?ID=2919).
 - Introduced the ability to start a build from an existing creature.
 - Added  support for Lore skills.
 - Added support for traits.
 - Added support for spellcasting
 - Ability to load custom roadmaps
 - Minor UI changes.

To use the **Creature Builder**, you can create a blank NPC or start with an existing one.
When starting from an **existing creature**, the new creature will **inherit all data** from the base creature, including:
- Attributes and statistics
- Skills and Lore skills
- Traits
- Spellcasting (if present)

The only elements that are **not inherited** are **all strike-related data**.  
Strikes are replaced using the values provided in the Creature Builder form.

If the resulting creature is a **spellcaster of a higher level than the base creature**, the module will automatically grant additional spell slots:
- **Prepared spellcasters** receive spell slots based on the **wizard spellcasting table**, for more info see [Wizard Class](https://2e.aonprd.com/Classes.aspx?ID=39)
- **Spontaneous spellcasters** receive spell slots based on the **sorcerer spellcasting table**, for more info see [Sorcerer Class](https://2e.aonprd.com/Classes.aspx?ID=62)

### Accessing the Creature Builder

When you open an actor’s **Character Sheet**, you will find a button at the top labeled **Creature Builder**. Clicking this button opens the creature builder interface.

Inside the builder, you can:
- Select one of the official **roadmaps**, which automatically sets values appropriate for a given monster type
- Or manually create a unique creature by adjusting any of the available drop-down menus

By default:
- All values are set to `moderate`
- The creature level is set to `-1`, meaning the creature has no inherent strengths or weaknesses

If you plan to customize values manually rather than using a roadmap, consult the [PF2e Official Creature Building Guide](https://2e.aonprd.com/Rules.aspx?ID=995) to ensure the creature remains balanced.

Once all values are set, click the **Submit** button. This will generate a new creature and automatically open its sheet.

If you want to start over at any time, click **Reset to Defaults**, which will clear all changes made in the form.

Each group within the form can be expanded or collapsed by clicking its header. By default, all groups are expanded except for **Skills** and **Lore Skills**.

Below are the images of the form:

First part contains all the important values like Hit Points, Level, Name etc.

![Page One of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageOne.png?raw=true)

The Second part contains all the skills as well as the `Submit` button and `Reset to Defaults` button.
![Page Two of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageTwo.png?raw=true)

Traits will show you suggestions from the list of existing ones, or you can add a new one.
![Traits](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/TraitsSection.png?raw=true)

Lore section allow to specify any number of additional lore entries if needed.

![Lore Section](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/LoreSection.png?raw=true)

Here is a comparison of size in relation to UI:
![Full UI Size](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/FullUIImage.png?raw=true)
