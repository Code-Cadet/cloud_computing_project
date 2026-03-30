# Use the official Nginx image as the base
FROM nginx:alpine

# Remove the default nginx static assets
RUN sed -i 's/listen\(.*\)80;/listen 8080;/' /etc/nginx/conf.d/default.conf


# Copy static website files to nginx's public folder
RUN rm -rf /usr/share/nginx/html/*
COPY index.html /usr/share/nginx/html/
COPY notes_app.js /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/

# Expose port 8080
EXPOSE 8080

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
