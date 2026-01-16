<?php
$conn = new mysqli('localhost', 'jybcaorr_lisaaccountcontentapi', 'ISlc)_+hKk+g2.m^', 'jybcaorr_lisacontentdbapi');

if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error . PHP_EOL);
}

echo "Connected to database successfully!" . PHP_EOL;

$sql = file_get_contents('/home/jybcaorr/ADD_TOPLIST_PROMPTS.sql');

if ($conn->multi_query($sql)) {
    do {
        if ($result = $conn->store_result()) {
            while ($row = $result->fetch_assoc()) {
                print_r($row);
            }
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo PHP_EOL . '✅ Toplist prompts inserted successfully!' . PHP_EOL;
} else {
    echo '❌ Error: ' . $conn->error . PHP_EOL;
}

$conn->close();
