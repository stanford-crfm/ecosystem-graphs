# Ecosystem Graphs

## Overview
Welcome! Ecosystem Graphs is an ongoing effort to track the foundation model ecosystem, namely both the assets (datasets, models, and applications) and their relationships. Using it, one can answer questions such as: What are the latest foundation models? Who builds them and where are they used downstream? What are the general trends over time? We hope that ecosystem graphs will be a useful resource for researchers, application developers, policymakers, and the public to better understand the foundation models ecosystem.

To explore the ecosystem, check out the [website](https://crfm.stanford.edu/ecosystem-graphs/) or read the [paper](https://arxiv.org/abs/2303.15772).

Briefly, an ecosystem graph is defined by:
- **Assets.** These are the nodes in the graph, which can be datasets (e.g. The Pile), models (e.g. Stable Diffusion), or applications (e.g. Microsoft Word).
- **Dependencies.** These are the edges in the graph, which indicate how assets are built (e.g. the BLOOM model is trained on the ROOTS dataset).
- **Ecosystem cards.** These are structured cards that house metadata on each asset (e.g. who built it, when, what is the license).

## Contribute
We actively encourage community contributions. To contribute:
- Add assets by filling out [this form](https://forms.gle/VqnSsZhv62hJ5rP36). No coding expertise required!
- Submit a PR (run `precommit.sh` before submitting)

To visualize and explore your changes, start a local server:

    python server.py

and navigate to [http://localhost:8000](http://localhost:8000).

## Cite as

```
@article{bommasani2023ecosystem-graphs,
  author       = {Bommasani, Rishi and
                  Soylu, Dilara and
                  Liao, Thomas I. and
                  Creel, Kathleen A. and
                  Liang, Percy},
  title        = {Ecosystem Graphs: The Social Footprint of Foundation Models},
  month        = mar,
  year         = 2023,
  url          = {https://arxiv.org/abs/2303.15772}
}
```
