This is the front end.  It must run on the same host as the back end.  The backend is at
 https://github.com/ran-eh/no-server.

To build and run

```bash
git clone https://github.com/ran-eh/no-client
cd no-client
docker build -t no-client .
docker run -p 8080:8080 no-client &
```

To run go to http://ec2-3-19-32-250.us-east-2.compute.amazonaws.com:8080

To create a new editor instande, click the New button, and edit between the horizontal line.

To run another editor on the same file, copy/paste the url from the browser.