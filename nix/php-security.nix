{ pkgs }:

# Keep Nixpacks' non-PHP dependencies unchanged. Pin every PHP-dependent
# package (including Composer and extensions) through the same overlay.
pkgs.appendOverlays [
  (final: prev:
    let
      fixedPhp = php: version: sha256:
        (php.override {
          packageOverrides = pfinal: pprev: {
            extensions = pprev.extensions // {
              # The new OOM tests invoke CGI with -n. Explicitly load the
              # shared filter module in that child, retaining every assertion.
              filter = pprev.extensions.filter.overrideAttrs (old: {
                postPatch = (old.postPatch or "") + ''
                  substituteInPlace tests/oom_filter_default_encoded.phpt tests/oom_filter_input.phpt tests/oom_filter_input_array.phpt \
                    --replace-fail "getenv('TEST_PHP_CGI_EXECUTABLE'), '-n'," "getenv('TEST_PHP_CGI_EXECUTABLE'), '-n', '-d', 'extension=' . __DIR__ . '/../modules/filter.so',"
                '';
              });
            };
          };
        }).overrideAttrs (old: {
          inherit version;
          src = prev.fetchurl {
            url = "https://www.php.net/distributions/php-${version}.tar.xz";
            inherit sha256;
          };
        });
    in {
      php82 = fixedPhp prev.php82 "8.2.35" "5737b98601fe5ab1b8c5db0c82ed3158acb9283ed3081ffe2faffb9ac81455e6";
      php83 = fixedPhp prev.php83 "8.3.36" "dd54693aa334c5c4d72e9aee96b082c2473750a18a6c1d105789c93a3b1692fd";
      php84 = fixedPhp prev.php84 "8.4.27" "dcf93923b0e38e0d5252b25b796520b5a47761a08b3488b6d0b5d1115764d3f0";
    })
]
