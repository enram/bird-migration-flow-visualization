# STSM report

## Introduction

This is a report for a Short Term Scientific Mission (STSM) for the [COST Action ES1305](http://www.cost.eu/domains_actions/essem/Actions/ES1305): *European Network for the Radar surveillance of Animal Movement (ENRAM)* under working group 3: *[Visualizing spatio-temporal patterns of animal movement](www.enram.eu/working-group-3/)*.

* **STSM title**: Bird migration visualization hackathon
* **Host institution**: [Research Group of Computational Geo-Ecology](http://ibed.uva.nl/research/research-groups/research-groups/research-groups/content/folder/computational-geo-ecology/computational-geo-ecology.html) at the University of Amsterdam in the Netherlands under the coordination of Dr. Judy Shamoun-Baranes.
* **Grantee**: Peter Desmet, Bart Aelterman, Kevin Azijn from the [LifeWatch team](http://lifewatch.inbo.be) at the Research Institute for Nature and Forest (INBO) in Belgium.
* **Dates**: June 2 to 6, 2014

## Purpose

The goal of this STSM is threefold:

1. To create a usable case study dataset of a multiday bird migration event, based on data recorded by 5 weather radars (and possibly 2 military radars) in Belgium and the Netherlands, and reference weather data.
2. To develop an open source prototype of a flow visualization (similar to [http://air.nullschool.net/](http://air.nullschool.net/)), using this dataset.
3. To publicly document the dataset and prototype as guidelines for a data challenge to be organized in 2015. The aim and structure of this data challenge will also be set during this STSM.

## Description of the work

Milestone links below give a list of the achieved tasks and closed issues. For an overview of all achieved milestones for the visualization, [see here](https://github.com/enram/bird-migration-flow-visualization/issues/milestones?state=closed).

### Monday June 2

* Introduction meeting with [UvA team](http://ibed.uva.nl/research/research-groups/research-groups/research-groups/content/folder/computational-geo-ecology/computational-geo-ecology.html) (Dr. Judy Shamoun-Baranes, Prof. Dr. Willem Bouten and Hans van Gasteren), [LifeWatch INBO team](http://http://lifewatch.inbo.be) (Peter Desmet, Bart Aelterman, and Kevin Azijn), and ENRAM collaborator (Hidde Leijnse, [KNMI](http://www.knmi.nl))  
* Define use cases and milestones for the visualization prototype
* Define milestones for the case study dataset
* **Milestone**: create open-source [GitHub repository for the visualization](https://github.com/enram/bird-migration-flow-visualization/)
* **Milestone**: create open-source [GitHub repository for the case study dataset](https://github.com/enram/case-study)
* Upload bird migration altitude profiles data
* Upload radar position data
* Describe case study story
* **Milestone**: [documented basemap data](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=4&state=closed)

### Tuesday June 3

* **Milestone**: [visualization with curved lines](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=9&state=closed)
* **Milestone**: [visualization with basemap](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=3&state=closed)
* **Milestone**: [visualization with 5 lines](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=1&state=closed)

### Wednesday June 4

* Follow-up meeting with same participants as introduction meeting and invitees from UvA, NLeSC and surfSARA.
* Prioritize remaining milestones
* Discuss aim and structure of a visualization challenge to be organized in the coming year, based on the experience of this STSM
* **Milestone**: [visualization with altitude band selection](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=2&state=closed)
* Upload reflectivity-ppi data
* **Milestone**: [documented bird migration data](https://github.com/enram/case-study/issues?milestone=1&state=closed)

### Thursday June 5

* **Milestone**: [Visualization with time selection](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=7&state=closed)
* **Milestone**: [Visualization with interpolated points](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=8&state=closed)
* **Milestone**: [Visualization with time animation](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=13&state=closed)
* Discussion with Dr. Judy Shamoun-Baranes regarding further collaborations/opportunities

### Friday June 6

* Fix remaining bugs in visualization
* [Launch visualization](http://enram.github.io/bird-migration-flow-visualization/viz/)
* Announce visualization via [Twitter](https://twitter.com/lifewatchinbo/status/474850448839802880) and other communication channels
* Write report
* **Milestone**: [README](https://github.com/enram/bird-migration-flow-visualization/issues?milestone=6&state=closed)

## Personal contribution

### Peter Desmet ([@peterdesmet](https://twitter.com/peterdesmet))

My main contribution to this STSM was coordination and documentation. I communicated with the involved researchers regarding the case study data, how to document these, the visualization challenge, and how to use GitHub, as well as with my team regarding milestones and priorities for our visualization prototype. I recorded all required use cases and tasks as issues ([here](https://github.com/enram/bird-migration-flow-visualization/issues/created_by/peterdesmet?state=closed) and [here](https://github.com/enram/case-study/issues/created_by/peterdesmet?state=closed)) and documented the majority of the case study data, as well as the visualization. I also added the data to our CartoDB backend and created the design of the visualization.

As all work on this STSM was done publicy on GitHub, my contributions can also be found [here](https://github.com/peterdesmet?tab=contributions&from=2014-06-02&to=2014-06-06#contribution-activity).

### Bart Aelterman ([@bartaelterman](https://twitter.com/bartaelterman))

### Kevin Azijn ([@kazijn](https://twitter.com/kazijn))

## Results

### Create case study dataset

Available at <https://github.com/enram/case-study>

* Extracted, uploaded, and documented [bird migration altitude profiles dataset](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles) retrieved from weather radars
* Extracted and uploaded [radar locations dataset](https://github.com/enram/case-study/blob/master/data/radars/radars.geojson)
* Extracted and uploaded [reflectivity ppi dataset](https://github.com/enram/case-study/tree/master/data/reflectivity-ppi)
* Extracted, uploaded and documented [basemap for Belgium and the Netherlands](data/basemap)
* Started [documentation](https://github.com/enram/case-study/blob/master/data/README.md) regarding these data
* Wrote [description of the case study](https://github.com/enram/case-study/blob/master/documentation/story.md)

### Develop a prototype of a flow visualization

Available at <https://github.com/enram/bird-migration-flow-visualization>

* Created a functional [bird migration flow visualization prototype](http://enram.github.io/bird-migration-flow-visualization/viz/) using the data of the case study
* [Open sourced](https://github.com/enram/bird-migration-flow-visualization) the code (under an MIT license)
* [Documented the visualization](https://github.com/enram/bird-migration-flow-visualization/blob/master/README.md)

### Document dataset and prototype as guidelines for a visualization challenge to be organized in 2015

* Case study dataset is almost completely documented, further documentation will be added for the visualization challenge
* Visualization prototype is fully documented on GitHub (see above), including [all activity](https://github.com/enram/bird-migration-flow-visualization/commits/master)

### Discuss aim and structure of a visualization challenge

We plan to organize a visualization challenge (originally "data challenge") end of 2014 / early 2015 to see what other visualizations can be made with the case study data. The idea is to further develop interesting results, so these can be used by researchers and the general public to discover and analyze the data ENRAM will generate.

Provisional timeline:

1. Summer 2014: Further document use case and record specific use cases
2. October 2014: Present this STSM and announce visualization challenge at the ENRAM meeting in Spain
3. December 2014: Organize a 3 day hackathon as the kick off for the data challenge. This STSM has learned us that is important to allow enough time for the developers to build up some momentum and to have direct contact with the researchers so questions can be answered quickly. The hackathon will start with an introduction and end with presentations of early results, with the possibility for teams to participate remotely.
4. January-March 2014: Visualization challenge, where teams can (continue to) work on their visualization remotely. Teams can join at any time, but results should be submitted before the deadline and open sourced.
5. April 2014: End of the visualization challenge. The most interesting visualizations will be selected and announced, and the teams contacted for further collaboration.

## Future collaborations / opportunities

All future collaborations will include additional ENRAM partners:

* Work towards a case study that covers a larger extent of the ENRAM network
* Extend the visualization to encompass larger case study area
* Extend the visualization with extra functionalities (see [these milestones](https://github.com/enram/bird-migration-flow-visualization/issues/milestones?with_issues=no))
* Joint collection of use cases for this and other visualizations
* Joint publications for the scientific community
* Training of early stage researchers

## Outreach / foreseen publications

This only includes the outreach and foreseen publications in the 5 days since the visualisation was launched. In this timespan, the visualization was visited by 390 unique visitors from 24 countries.

* Public dissemination via [Twitter](https://twitter.com/cost_enram)
* Blog post on the [LifeWatch INBO blog](http://lifewatch.inbo.be/blog/posts/bird-migration-flow-visualization.html)
* Judy Shamoun-Baranes, Jason Chapman, Adriaan Dokter, Hans van Gasteren, Maarten de Graaf, Hidde Leijnse & Felix Liechti. 2014. Continental-scale Radar Monitoring of the Aerial Movements of Animals. 26th International Ornithological Congress. 18-24 August 2014, Tokyo, Japan. (oral presentation) 
* Hidde Leijnse, Adriaan Dokter, Günther Haase, Przemysław Jacewicz, Matti Leskinen, Alessio Balleri, Judy Shamoun-Baranes, Jose A. Alves, Silke Bauer, Ommo Hüppop, Jarmo Koistinen, Felix Liechti, Hans van Gasteren & Jason W. Chapman. 2014. The European Network for the Radar Surveillance of Animal Movement. 8th European Conference on Radar in Meteorology and Hydrology. 1-5 September 2014, Garmisch-Partenkirchen, Germany. (oral presentation)

## Confirmation letter by host institution

To be attached.
