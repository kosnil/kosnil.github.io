---
title: Automated Detection of Match Phases in Football from Spatio-Temporal Tracking Data Using Graph Neural Networks
year: 2026
status: preprint
venue: arxiv
authors:
  - Vincent Renner
  - Pascal Bauer
  - Melanie Schienle
paperUrl: https://arxiv.org/abs/2610.11571
codeUrl: https://gitlab.kit.edu/vincent.renner/match_phase_detection
links:
  - label: Paper
    url: https://arxiv.org/abs/2610.11571
  - label: Code and results
    url: https://gitlab.kit.edu/vincent.renner/match_phase_detection
visualization: none
order: 2
---

Spatio-temporal tracking data has opened new possibilities for detecting complex tactical patterns in football, yet modeling the interactive movements of multiple players remains challenging.
This paper proposes a framework combining graph neural networks (GNNs) with a sequential model to classify match phases on a second-by-second basis across a seven-class taxonomy. Match phase classification is tactically meaningful, and the availability of rule-based labels across 203 matches makes it a suitable testbed for a systematic comparison of adjacency constructions and message-passing layers, a question that has received limited attention in existing research. 
Our selected GNN-LSTM model outperforms all aggregated-feature baselines, including XGBoost and a Long Short-Term Memory (LSTM) network, as the strongest baseline scores 4.6% lower in macro F1. Graph representations using a domain-informed Delaunay triangulation that approximates passing lanes, paired with a custom Spatial Edge-Augmented Convolution (SEAConv) layer that injects edge attributes directly into messages, achieve the best performance by capturing spatial dependencies while limiting uninformative messages from redundant edges. 
Integrated Gradients attributions indicate the model uses spatial player configurations, particularly horizontal positioning, in combination with possession and ball-status indicators. 
This work offers an automated solution for fine-grained tactical analysis, reducing the need for manual tagging and providing deeper insight into dynamic team behavior.
