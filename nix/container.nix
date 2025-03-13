{ pkgs, lib, config, ... }:
with lib;
let
  solc = (pkgs.callPackage ./solc.nix { });
  nil = (pkgs.callPackage ./nil.nix { solc = solc; });
  devnetConfig = {
    nild_config_dir = "etc/nild";
    nild_credentials_dir = "etc/nild";
    nild_p2p_base_tcp_port = 30303;
    nil_wipe_on_update = true;
    nil_rpc_port = 8529;
    pprof_base_tcp_port = 6060;
    nShards = 5;
    nil_config = [
      {
        id = 0;
        shards = [ 0 1 ];
        splitShards = true;
        dhtBootstrapPeersIdx = [ 0 2 3 ];
      }
      {
        id = 1;
        shards = [ 0 2 ];
        splitShards = true;
        dhtBootstrapPeersIdx = [ 0 1 3 ];
      }
      {
        id = 2;
        shards = [ 0 3 ];
        splitShards = true;
        dhtBootstrapPeersIdx = [ 0 1 2 ];
      }
      {
        id = 3;
        shards = [ 0 4 ];
        splitShards = true;
        dhtBootstrapPeersIdx = [ 0 1 2 ];
      }
    ];
    nil_archive_config = [{
      id = 0;
      shards = [ 0 1 2 3 4 ];
      bootstrapPeersIdx = [ 0 1 2 3 ];
      dhtBootstrapPeersIdx = [ 0 1 2 3 ];
    }];
    nil_rpc_config = [{
      id = 0;
      dhtBootstrapPeersIdx = [ 0 1 2 3 ];
      archiveNodeIndices = [ 0 ];
    }];
  };

  format = pkgs.formats.yaml { };

  configFiles = pkgs.stdenv.mkDerivation {
    name = "devnet-configs";
    src = format.generate "devnet.yaml" devnetConfig;
    dontUnpack = true;
    buildInputs = [ nil ];
    buildPhase = ''
      mkdir etc
      nild gen-configs --basedir var/lib "$src"

      base="$(pwd)"
      find etc/nild/ -type f -name "*.yaml" -exec sed -i "s#$base/etc/nild#/etc/nild#g" {} +
      find etc/nild/ -type f -name "*.yaml" -exec sed -i "s#$base/var/lib#/var/lib#g" {} +
    '';
    installPhase = ''
      mkdir -p $out/etc
      cp -r etc/nild/* $out/etc
    '';
  };
in {
  boot.isContainer = true;

  networking.firewall.allowedTCPPorts = [ 80 ];

  environment.systemPackages = [ nil configFiles pkgs.vim ];

  environment.etc."nild".source = "${configFiles}/etc";

  environment.etc."exporter/exporter.yaml".text = ''
    clickhouse-password: ""
    clickhouse-endpoint: 127.0.0.1:9000
    clickhouse-login: "default"
    clickhouse-database: "nil_database"
    api-endpoint: http://127.0.0.1:8529
  '';

  users.users.nil = {
    isSystemUser = true;
    group = "nil";
  };
  users.groups.nil = { };

  systemd.services = builtins.listToAttrs (map (cfg: {
    name = "nil-${toString cfg.id}";
    value = {
      description = "nil-${toString cfg.id} service";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart =
          "${nil}/bin/nild run -c /etc/nild/nil-${toString cfg.id}/nild.yaml";
        Restart = "always";
        User = "nil";
        Group = "nil";
        WorkingDirectory = "/var/lib/nil-${toString cfg.id}";
        StateDirectory = "nil-${toString cfg.id}";
        RuntimeDirectory = "nil-${toString cfg.id}";

      };
    };
  }) devnetConfig.nil_config) //

    (builtins.listToAttrs (map (cfg: {
      name = "nil-rpc-${toString cfg.id}";
      value = {
        description = "nil-rpc-${toString cfg.id} service";
        after = [ "network.target" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${nil}/bin/nild rpc -c /etc/nild/nil-rpc-${
              toString cfg.id
            }/nild.yaml";
          Restart = "always";
          User = "nil";
          Group = "nil";
          WorkingDirectory = "/var/lib/nil-rpc-${toString cfg.id}";
          StateDirectory = "nil-rpc-${toString cfg.id}";
          RuntimeDirectory = "nil-rpc-${toString cfg.id}";

        };
      };
    }) devnetConfig.nil_rpc_config)) //

    (builtins.listToAttrs (map (cfg: {
      name = "nil-archive-${toString cfg.id}";
      value = {
        description = "nil-archive-${toString cfg.id} service";
        after = [ "network.target" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${nil}/bin/nild archive -c /etc/nild/nil-archive-${
              toString cfg.id
            }/nild.yaml";
          Restart = "always";
          User = "nil";
          Group = "nil";
          WorkingDirectory = "/var/lib/nil-archive-${toString cfg.id}";
          StateDirectory = "nil-archive-${toString cfg.id}";
          RuntimeDirectory = "nil-archive-${toString cfg.id}";

        };
      };
    }) devnetConfig.nil_archive_config)) //

    {
      exporter = {
        description = "exporter service";
        after = [ "network.target" "clickhouse.service" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          ExecStart = "${nil}/bin/exporter -c /etc/exporter/exporter.yaml";
          Restart = "always";
          User = "nil";
          Group = "nil";
          WorkingDirectory = "/var/lib/exporter";
          StateDirectory = "exporter";
          RuntimeDirectory = "exporter";
          BeforeStart = ''
            ${pkgs.clickhouse}/bin/clickhouse-client --query "CREATE DATABASE IF NOT EXISTS nil_database"'';
        };
      };
    };

  services.nginx = {
    enable = true;
    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
    virtualHosts."default" = {
      locations = { "/" = { proxyPass = "http://127.0.0.1:8529"; }; };
      default = true;
    };
  };

  services.clickhouse = { enable = true; };
}
