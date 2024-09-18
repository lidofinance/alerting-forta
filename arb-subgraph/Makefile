# Makefile

.PHONY: gen_proto_prod
gen_proto_prod:
	# generate js codes via grpc-tools
	yarn grpc_tools_node_protoc \
	  --js_out=import_style=commonjs,binary:./dist/generated/proto \
	  --grpc_out=grpc_js:./dist/generated/proto \
	  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
	  -I ./src/brief/proto \
	  ./src/brief/proto/*.proto

.PHONY: gen_js
gen_js:
	# generate js codes via grpc-tools
	yarn grpc_tools_node_protoc \
	  --js_out=import_style=commonjs,binary:./src/generated/proto \
	  --grpc_out=grpc_js:./src/generated/proto \
	  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
	  --proto_path=./src/brief/proto \
	  ./src/brief/proto/*.proto

.PHONY: gen_ts
gen_ts:
	# generate d.ts codes
	yarn grpc_tools_node_protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --ts_out=grpc_js:./src/generated/proto \
    --proto_path=./src/brief/proto \
    ./src/brief/proto/*.proto

tools:
	cd tools && go mod tidy && go mod vendor && go mod verify && go generate -tags tools
.PHONY: tools

.PHONY: check_alerts_syntax
check_alerts_syntax:
	./bin/promtool check rules ./alerts.yml

.PHONY: test_alerts
test_alerts:
	bin/promtool test rules ./alerts_tests.yml