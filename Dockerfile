FROM python:3.10.21-alpine3.24
WORKDIR /app
COPY . .
EXPOSE 80
CMD ["python3", "-m", "http.server", "8080"]
