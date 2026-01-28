# fvtt-module-pf2e-CreatureBuilderForm

This is forked from the [pf2e-monster-maker](https://github.com/mikolajg-tt/pf2e-monster-maker). Thanks to the creator **mikolajg-tt** for the solid foundation and great work on the original module.

The download link: https://github.com/dosexe/foundryvtt-pf2e-creature-builder/releases/latest/download/module.json

A Foundry VTT module designed for Pathfinder 2E System, that allows you to create combat NPCs from scratch or from existing creature, using values from the [Pathfinder 2e Building Creatures Guide](https://2e.aonprd.com/Rules.aspx?ID=995)

Main differences from the original module:
 - Added support for all official roadmaps as defined in the [Pathfinder 2e rules](https://2e.aonprd.com/Rules.aspx?ID=2919).
 - Introduced the ability to start a build from an existing creature.
 - Added  support for Lore skills.
 - Added support for traits.
 - Minor UI changes

To use the **Creature Builder**, you can create a blank NPC or start with an existing one. 
For existing creature note that some of the values won't be inherited, like attacks/actions/passives, although those can be easily added afterward if needed.

When you open actor **Character Sheet**, you can find a button at the top named **Creature Builder**. Clicking this button will open the creature builder.
In there, you either use one of the roadmaps, allowing you to set values automatically for a given monster type, or you could create your unique creature by changing any of the drop-down menus.

By default, all values are `moderate`, meaning you will get a creature that does not possess strengths or weaknesses. If you are planning to use your values rather than roadmaps, please take a look at the [PF2e Official Creature Building Guide](https://2e.aonprd.com/Rules.aspx?ID=995) to see how to create a balanced monster. 
Whenever you give a monster a strength, don't forget to give it a weakness to compensate. When you are happy with your values for the monster, click the `Submit` button. This will create a new creature and open its sheet on the screen.
Note each group in the form is clickable and can be expanded or collapsed. By default, all groups are expanded, except `Skills` and `Lore Skills` 

Below are the images of the form:
First part contains all the important values like Hit Points, Level, Name etc.
The Second part contains all the skills as well as the Submit Button.

![Page One of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageOne.png?raw=true)
![Page Two of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageTwo.png?raw=true)
![Traits](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/TraitsSection.png?raw=true)
![Lore Section](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/LoreSection.png?raw=true)

Here is a comparison of size in relation to UI:
![Full UI Size](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/FullUIImage.png?raw=true)
