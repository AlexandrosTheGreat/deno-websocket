# https://github.com/hayd/deno-docker/blob/master/ubuntu.dockerfile
FROM hayd/ubuntu-deno:latest

# Change user UID / GID to 1000 and home folder
RUN usermod -u 1000 deno \
    && groupmod -g 1000 deno \
    && chown deno:deno /deno-dir/ \
    && mkdir -p /home/deno \
    && chown deno:deno /home/deno \
    && chmod 751 /home/deno \ 
    && rm -rf /usr/local/bin/docker-entrypoint.sh

USER deno
WORKDIR /workspace
ENTRYPOINT []
CMD []