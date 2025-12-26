
function authenticate(req,res,next){
    const token = req.cookies.token;

    if (!token) {
        if (req.path.startsWith('/api')) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        return res.redirect("/login");
    }
    next()
}

module.exports = authenticate