#!/usr/bin/env bash

sudo apt-get update
sudo apt-get install -y python-software-properties
sudo apt-add-repository -y ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo apt-get install -y build-essential
sudo apt-get install -y texlive-latex-recommended
sudo apt-get install -y rubber