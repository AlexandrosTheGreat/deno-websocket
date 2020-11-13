# https://github.com/hayd/deno-docker/blob/master/ubuntu.dockerfile
FROM hayd/ubuntu-deno:latest

# Change user UID / GID to 1000 and home folder
RUN usermod -u 1000 deno \
    && groupmod -g 1000 deno \
    && chown deno:deno /deno-dir/ \
    && mkdir -p /home/deno \
    && chown deno:deno /home/deno \
    && chmod 751 /home/deno \ 
    && rm -rf /usr/local/bin/docker-entrypoint.sh \
    # Install git
    && apt-get update \
    && apt-get install -y git \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* \
    && chown deno:deno /usr/local/bin

USER deno

# Install denon
RUN deno install -qAf --unstable https://deno.land/x/denon@2.4.4/denon.ts

WORKDIR /workspace
ENTRYPOINT []
CMD []