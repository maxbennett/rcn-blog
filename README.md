# Recursive Cortical Networks

An interactive introduction to RCN and its proposed relationship to the neocortical microcircuit.

[Read the article](https://maxbennett.github.io/rcn-blog/)

## Hosting

This repository is the static website: HTML, CSS, JavaScript, fonts, and figure assets.
GitHub Pages serves the root of the `main` branch. No build step or backend is needed.

For a local preview, run `python -m http.server 8000` in this directory and open
http://localhost:8000/ .

## CAPTCHA examples

Figure 10 cycles through 15 selected successful predictions with a Refresh CAPTCHA
button and a green checkmark for each correctly recognized region. This is an
illustration of successful recognition, not an accuracy benchmark.
The browser displays the saved PNG images and results in `rcn-captcha-examples.js`.
They were produced with the released MNIST classifier and 100 learned exemplars.
The digit-separation adapter is a simplified demo, not the full published CAPTCHA
parser. Predictions are recorded unchanged. The saved data includes model/input
hashes, inference settings, and the selection criterion.

## Updating

Edit the static files and push to `main`; GitHub Pages publishes the update.
The research code, model cache, notebooks, and source papers are not needed to host this site.

Sources and credits for the research figures are linked in the article. Bundled
fonts retain their license files. The article remains a draft; author and date
placeholders can be filled in before a formal release.
