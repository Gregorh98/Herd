from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/herd")
def herd():
    return render_template("herd.html")

app.run(debug=True)