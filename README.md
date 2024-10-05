# Jon & Gabriella's Wedding Website

This project is the website for the wedding of me and my lovely fiancé Gabriella. It includes a basic system for handling RSVPs. This site is build using [Bun](https://bun.sh/), mostly because it is more convienient to use than Node.js when using TypeScript.

## Running the project

Before you get started make sure you have [Bun](https://bun.sh/) installed, then install the required dependencies:

```sh
bun install
```

Since a Postgres database is required you'll have to start a server. I am using [Podman](https://podman.io/), but you can run the database any way you like:

```sh
podman run --rm -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 postgres
```

A SMTP server is also required, during development you can use something like [MailDev](https://github.com/maildev/maildev):

```sh
podman run --rm -e MAILDEV_OUTGOING_USER=someuser -e MAILDEV_OUTGOING_PASS=nobodyknows -p 1080:1080 -p 1025:1025 maildev/maildev
```

Go to http://localhost:1080 to see the Web UI for MailDev.

Now that everything is set up you can run the application:

```bash
bun dev
```

Open http://localhost:3000 to see the site.
