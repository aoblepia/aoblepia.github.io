---
title: "LoRa + GPS Sensor Board"
position: "Notre Dame Environmental Change Initiative (ND-ECI)"
location: "Notre Dame, IN"
date: 2023-11-12
collection: project
permalink: /project/lora
---

I designed a PCB based around the RP-2040 that interfaced with GPS, LoRa, and other I2C devices to communicate group position and sensor data for rainforest preservation telemetry.

This was a great experience where I was able to design a custom power management circuit, a custom circular buffer datatype, and lay out and customize the design of the PCB. I used KiCAD to create the layout and FreeRTOS to help manage the different activities that the device would have to perform.

The board reporting GPS data: [GPS + LoRa PCB](gps_lora.png)