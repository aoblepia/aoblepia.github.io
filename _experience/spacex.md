---
title: "SpaceX"
position: "Engineering Intern - Starlink"
team: "Gateway Test Engineering"
collection: experience
permalink: /experience/spacex
date: 2024-08-15
date_string: "Summer 2024"
location: "Redmond, WA"
---

This summer I am interning at SpaceX on the Gateway Test & Engineering team. 

Gateways are high speed connections to the Starlink satellite network to provide high bandwidth access for datacenters and businesses.

I developed two test systems for critical Gateway subsystems which helped validate hardware and software.

My first project was to create a test system for the Gateway's UPS subsystem. This full testbed load tested the UPS and validated the connections of the internal PCBA, checking for things like heater connections and internal temperature reporting. I wrote a complete Python testcase for this subsystem which reported data to our internal collection/test database.

My other project was to expand the Satellite backhaul testbench to include the signal chain for the Gateway. I adapted the software and hardware of the existing bench to include the new functionality. This will help enable CI builds for production software.