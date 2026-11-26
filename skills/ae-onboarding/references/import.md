# Import the Demo replay

1. The confirmed Demo plan covers exposure, coupon and purchase events in the generated `replay.jsonl`. Resolve the saved Demo project's AppID and receiver from `ae-cli analysis project info get --project-id <demo-project-id>`. Use the generated JSONL and its fingerprinted mapping. Check that exposure uses the built-in event and preset fields and that outcomes use the confirmed sample, item, cohort, and event names.
2. Convert the combined dataset into a new directory. The generated UTC timestamps use `yyyy-MM-dd HH:mm:ss.SSS`. Conversion writes each timestamp as the top-level `#time` in the same format, with `#zone_offset=0` in the event properties.

   ```sh
   ae-cli data-integration convert --input-file replay.jsonl \
     --mapping replay.mapping.json --output-dir <converted-directory>
   ```

3. Check the manifest has the expected row count and zero quarantined records. Use the confirmed Demo's `/sync_json` Receiver endpoint. Run the command below first with `--dry-run`. Check that the dry run reports one batch and that the file, manifest and destination match the confirmed Demo. Then run the same upload without `--dry-run`. Keep the APPID out of generated files and user-visible logs.

   ```sh
   ae-cli data-integration upload --ue-file <converted-directory>/valid.ue.jsonl \
     --manifest <converted-directory>/manifest.json --endpoint <receiver-sync-json-url> \
     --appid <appid> --batch-size 1000 --dry-run
   ```

4. Verify all three event types together with the tracking data tools in `ae-data-integration`. Check the exposure assignment and the five-second offset using the stored run receipt and event UUIDs. Record the verified upload by run ID and reconcile uncertain delivery before any retry. Receiver acceptance alone does not establish persistence or experiment attribution.
