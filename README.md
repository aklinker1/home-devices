# Home Devices

This is my home automation package. It works by hosting the `client-remote` application on DigitalOcean, and the `client-local` application on a RaspberryPi. The the `device-*` applications are the applications hosted on the individual Arduinos or other RaspberryPis.

Each application is written in their own language based of the needs of the device.

---

## `client-remote`

Hosted at [home.aklinker1.io/api](https://home.aklinker1.io/) on [DigitalOcean](https://cloud.digitalocean.com/projects/3ce00a30-d44a-457e-8dad-7ae2a07bbd3c/resources?i=73cb25).

---

## `client-local`

Hosted on my local RaspberryPi. It will be on port `7999`. It will update the IP address of the itself every 30 minutes on the `client-remote`.

```bash
# Windows
ssh aklinker1@klinker-server

# Linux/Mac
ssh aklinker1@klinker-server.local
```

---

## `device-*`

Each device will handle the `GET /discover` endpoint on a port between `8001` through `8009`. `*` represents devices I plan on making in the future.

### Current Device Types

- `garden`
- `*nock`
- `*picture`
- `*video`
- `*ftp`
- `*google-home`
