FROM golang:1.20-alpine
WORKDIR /app
COPY go.mod ./
# RUN go mod download
COPY main.go ./
RUN go build -o api main.go
# Install docker CLI so it can exec into fabric-cli
RUN apk add --no-cache docker-cli
CMD ["./api"]
