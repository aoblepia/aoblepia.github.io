---
title: "UART Tx Datapath Synthesis"
position: "Google XLS"
location: "Notre Dame, IN"
date: 2023-12-13
collection: project
permalink: /project/xls
---

I was able to use Google's synthesis toolchain to design a custom UART transmitter datapath. XLS creates synthesizable Verilog from a Rust-like description language. 

I wrote a complete set of unit tests to validate performance of the datapath and to ensure that the transmitter would properly send bits.

More about Google XLS: [Google XLS Docs](https://google.github.io/xls/)