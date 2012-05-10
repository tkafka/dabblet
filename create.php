<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    
    
    // ---
    // Process a POST request from a foreign server.
    // create a javascript to save the variables to localStorage
    // ---
    
    
    $css = isset($_REQUEST['css']) ? json_encode($_REQUEST['css']) : '""'; 
    $html = isset($_REQUEST['html']) ? json_encode($_REQUEST['html']) : '""';
    $callback = isset($_REQUEST['callback']) ? json_encode($_REQUEST['callback']) : '""';
    
    ?>
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <title></title>
            
            <!-- JavaScripts -->
            <script src="code/store.js"></script>
            <script>
                var css = <?php echo $css; ?>;
                var html = <?php echo $html; ?>;
                var callback = <?php echo $callback; ?>;
                
                
                var store = new Store("dabblet");
                store.set("css", css, false);
                store.set("html", html, false);
                store.set("callback", callback, false);
                
                document.location.href = document.location.href.replace("create.php", "");
            </script>
        </head>
        <body>
            Redirecting...
        </body>
    </html>
    <?php
    
    
    
} else {
    
    
    // ---
    // create a form to send post request
    // (this would be the foreign site)
    // ---
    
    ?>
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <title></title>
            
            <style>
                body {
                    margin: 10px;
                }
            </style>
        </head>
        <body>
            <form action="" method="post">
                <textarea id="css" name="css" placeholder="css"></textarea><br>
                <textarea id="html" name="html" placeholder="html"></textarea><br>
                <input id="callback" type="text" name="callback" placeholder="callback" value="">
                <input id="" type="submit" name="button" value="Post to site">
            </form>
        </body>
    </html>
    <?php
}