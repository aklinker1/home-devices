#!/bin/bash

echo -e "\033[0m\n\033[1m1. \033[94mRemoving old instance\033[0m\033[2m"
echo '$ rm -rf home-devices'
rm -rf home-devices

echo -e "\033[0m\n\033[1m2. \033[94mCloning 'home-devices'\033[0m\033[2m" &&
echo '$ git clone git@github.com:aklinker1/home-devices.git' &&
git clone github-home-devices:aklinker1/home-devices.git &&

echo -e "\033[0m\n\033[1m3. \033[94mBuilding 'client-local'\033[0m\033[2m" &&
echo '$ yarn build' &&
cd home-devices/client-local &&
yarn install &&
yarn build &&
cd ../ &&

echo -e "\033[0m\n\033[1m4. \033[94mStarting application\033[0m\033[2m" &&
echo '$ pm2 startOrReload klinker-server.ecosystem.json --only home-devices-local-client' &&
pm2 startOrReload klinker-server.ecosystem.json --only home-devices-local-client

echo -e "\033[0m"
