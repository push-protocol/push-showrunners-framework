#!/bin/bash
yarn run build
pm2 reload ecosystem.config.js --env production
pm2 delete 3 2 1
# EOF