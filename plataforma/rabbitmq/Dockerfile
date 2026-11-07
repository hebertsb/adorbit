FROM rabbitmq:3.13-management-alpine

COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY definiciones.json /etc/rabbitmq/definiciones.json
RUN chown -R rabbitmq:rabbitmq /etc/rabbitmq

EXPOSE 5672 15672
