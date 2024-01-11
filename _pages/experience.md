---
layout: archive
title: "Experience"
permalink: /work-experience/
author_profile: true
---
{% include base_path %}

{% for post in site.experience reversed %}
{% include archive-single.html %}
{% endfor %}